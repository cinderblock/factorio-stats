import FactorioConnection from './FactorioConnection';
import Koa from 'koa';
import Router from 'koa-router';
import trustProxy from 'koa-trust-proxy';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';

////////// Backend //////////

const conn = new FactorioConnection(
  process.env.RCON_HOST || 'localhost',
  process.env.RCON_PORT ? +process.env.RCON_PORT : 27015,
  process.env.RCON_PASSWORD || '',
);

////////// HTTP Server //////////

const app = new Koa();

app.use(cors());
app.use(bodyParser());

if (process.env.TRUST_PROXY) {
  app.use(trustProxy(process.env.TRUST_PROXY));
}

////////// Routes //////////

var router = new Router();

router.get('/status', (ctx, next) => {
  ctx.body = conn.getState();
  // console.log(`Sending status to ${ctx.request.ip} (${ctx.get('user-agent')})`);
});

// A hello post includes the name of the person saying hello
router.post('/grow', (ctx, next) => {
  const from = (ctx.request.body as { name: string })?.name || 'Anonymous';

  if (from.match(/^[-a-zA-Z0-9_ ]+$/) === null) {
    // TODO: Return this error to the client with JSON
    ctx.throw(400, 'Invalid name');
  }

  ctx.body = { status: 'ok' };
  console.log(`Sending hello from ${from} (${ctx.request.ip}) (${ctx.get('user-agent')})`);
  conn.sendMessageChat(`${from}: The Factory Must Grow!`);
});

app.use(router.routes()).use(router.allowedMethods());

////////// Error Handling //////////

app.use(async ctx => {
  ctx.throw(404, 'Nothing to see here');
});

////////// Start Server //////////

const listenPort = process.env.PORT || 3000;

app.listen(listenPort, () => {
  console.log(`Server running on port ${listenPort}. http://localhost:${listenPort}`);
});
