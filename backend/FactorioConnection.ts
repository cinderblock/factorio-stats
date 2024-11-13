import { match } from 'assert';
import RCON from 'ts-rcon';
// cSpell:ignore rcon

export default class FactorioConnection {
  private server;
  private status: 'connected' | 'disconnected' = 'disconnected';
  private version: string;
  private time: string;
  private seed: string;
  private evolution: {
    [planet: string]: {
      factor: number;
      time: number;
      pollution: number;
      kills: number;
    };
  } = {};
  private players: { [name: string]: null | number } = {};
  private verbose = false;
  private busy = false;
  private updateTimeout: NodeJS.Timeout;

  getState() {
    return {
      status: this.status,
      version: this.version,
      time: this.time,
      seed: this.seed,
      players: { ...this.players },
      evolution: { ...this.evolution },
    };
  }

  constructor(host: string, port: number, password: string) {
    this.server = new RCON(host, port, password);

    this.server.connect();

    this.server.on('auth', () => {
      console.log('Authenticated!');
      this.status = 'connected';

      this.update();
    });

    this.server.on('end', () => {
      console.log('Socket closed!');
      // TODO: Reconnect
    });

    this.server.on('server', (str: string) => {
      console.log('Server sent: ' + str);
    });

    this.server.on('error', (err: Error) => {
      console.error('Error: ' + err);
    });
  }

  private async send(command: string) {
    if (this.status === 'disconnected') {
      if (this.verbose) {
        console.log('Not connected, not sending command: ' + command);
      }
      return;
    }
    if (this.verbose) {
      console.log('Sending command: ' + command);
    }

    if (this.busy) {
      if (this.verbose) {
        console.log('Busy, not sending command: ' + command);
      }
      return;
    }
    this.busy = true;

    const response = new Promise<string>(resolve =>
      this.server.once('response', resolve),
    );

    this.server.send(command);

    const ret = await response;

    this.busy = false;

    if (this.verbose) {
      console.log('Response:');
      console.log(ret);
    }

    return ret;
  }

  async update() {
    if (this.status === 'disconnected') {
      return;
    }

    await this.updatePlayers();
    await this.updateTime();
    await this.updateVersion();
    await this.updateEvolution();
    await this.updateSeed();

    // await this.sendMessageChat("Updating factory status");

    const allPlayersOffline = !Object.values(this.players).reduce(
      (p, c) => p || c,
    );

    this.updateTimeout = setTimeout(
      () => this.update(),
      allPlayersOffline ? 1000 * 10 : 1000 * 1,
    );
  }

  async sendMessageChat(message: string) {
    if (message.startsWith('/')) {
      console.log('Ignoring command: ' + message);
      return;
    }

    await this.send(message);
  }

  async updateEvolution() {
    const evolution = await this.send('/evolution');

    if (!evolution) {
      if (this.verbose) {
        console.log('Failed to get evolution');
      }

      return;
    }

    const matches = evolution
      .split('\n')
      .filter(l => l)
      .map(l =>
        l.match(
          /(?:(?<planet>.+) - )?Evolution factor: (?<factor>[0-9.]+). \([tT]ime (?<time>[0-9.]+)%\) \(Pollution (?<pollution>[0-9.]+)%\) \(Spawner kills (?<kills>[0-9.]+)%\)/,
        ),
      );

    if (matches.some(m => !m)) {
      if (this.verbose) {
        console.log('Failed to parse evolution: ' + evolution);
      }

      return;
    }

    matches.forEach(m => {
      if (!m || !m.groups) {
        return;
      }

      const planet = m.groups.planet || 'Nauvis';
      // cSpell:ignore Nauvis

      this.evolution[planet] = {
        factor: +m.groups.factor,
        time: +m.groups.time / 100,
        pollution: +m.groups.pollution / 100,
        kills: +m.groups.kills / 100,
      };
    });

    if (this.verbose) {
      console.log('Evolution:');
      console.log(this.evolution);
    }
  }

  async updateSeed() {
    const seed = await this.send('/seed');

    if (seed) {
      this.seed = seed;
    }
  }

  async updateVersion() {
    const version = await this.send('/version');

    if (version) {
      if (this.version && this.version !== version) {
        console.log('Version changed: ' + this.version + ' -> ' + version);
      }
      this.version = version;
    }
  }

  async updateTime() {
    const time = await this.send('/time');

    if (time) {
      this.time = time;
    }
  }

  async updatePlayers() {
    const players = await this.send('/players');

    if (!players) {
      if (this.verbose) {
        console.log('Failed to get players');
      }

      return;
    }

    const match = players.match(
      /Players \((?<num>\d+)\):(?<players>(?:.|\n)*)/,
    );

    if (!match) {
      if (this.verbose) {
        console.log('Failed to parse players: ' + players);
      }

      return;
    }

    const numPlayers = +(match.groups?.num || '-1');

    const playersList = (match.groups?.players || '')
      .split('\n')
      .map(player => player.trim())
      .filter(player => player);

    if (numPlayers !== playersList.length) {
      if (this.verbose) {
        console.log('Mismatch in number of players: ' + numPlayers);
      }

      return;
    }

    if (this.verbose) {
      if (numPlayers) {
        console.log('Players: ' + playersList);
      }
    }

    playersList.forEach(player => {
      const match = player.match(/^(?<name>.+?)(?<online> \(online\))?$/);

      if (!match || !match.groups) {
        return;
      }

      const name = match.groups.name;
      const offline = !match.groups.online;

      if (offline) {
        if (this.players[name]) {
          console.log(name + ' left');
        }

        this.players[name] = null;
        return;
      }

      if (this.players[name]) return;

      console.log(name + ' joined');

      this.players[name] = Date.now();
    });
  }
}
