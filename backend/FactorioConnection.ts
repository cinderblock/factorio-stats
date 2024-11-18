import { match } from 'assert';
import RCON from 'ts-rcon';
import { FactoryStats } from '../ui/src/server';
// cSpell:ignore rcon

export default class FactorioConnection {
  private server;
  private status: 'init' | 'connected' | 'disconnected' = 'init';
  private version: string;
  private time: string | number; // Raw string or parsed number of hours
  private seed: string;
  private paused: boolean | null = null;
  private evolution: {
    [planet: string]: {
      factor: number;
      time: number;
      pollution: number;
      kills: number;
    };
  } = {};
  private players: {
    [name: string]: {
      lastChange: number | null; // Null means we haven't seen them yet
      online: boolean;
    };
  } = {};
  private verbose = false;
  private busy = false;
  private updateTimeout: NodeJS.Timeout;

  getState(): FactoryStats {
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

    this.server.on('auth', async () => {
      console.log('Authenticated!');

      await this.update();

      this.status = 'connected';
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
      // TODO: Reconnect

      return;
    }

    const lastState = this.getState();

    await this.updatePlayers();

    this.updateTimeout = setTimeout(
      () => this.update(),
      this.paused ? 1000 * 30 : 1000 * 1,
    );

    if (this.paused && this.status !== 'init') {
      // console.log('Paused, skipping updates to prevent spurious ticks');
      return;
    }

    await this.updateTime();
    await this.updateVersion();
    await this.updateEvolution();
    await this.updateSeed();

    // await this.sendMessageChat("Updating factory status");
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

      const planet = m.groups.planet || 'Nauvis'; // Factorio 1.0 has one planet
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

    if (!time) {
      console.log('Failed to get time');

      return;
    }

    const match = time.match(
      /^(?<hours>\d+) hours?(?:, (?<minutes>\d+) minutes? and (?<seconds>\d+) seconds?| and (?<minutes>\d+) minutes?)?$/,
    );

    if (!match?.groups) {
      // Failed to parse time. Just store the raw string as a fallback.
      this.time = time;

      console.log('Failed to parse time: ' + time);

      return;
    }

    const hours = +match.groups.hours;
    const minutes = +match.groups.minutes;
    const seconds = match.groups.seconds ? +match.groups.seconds : 0;

    this.time = hours + minutes / 60 + seconds / 60 / 60; // Hours
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

    const newChange = Date.now();

    let paused = true;

    playersList.forEach(player => {
      const match = player.match(/^(?<name>.+?)(?<online> \(online\))?$/);

      if (!match || !match.groups) {
        return;
      }

      const name = match.groups.name;
      const online = !!match.groups.online;

      if (online) {
        paused = false;
      }

      if (!this.players[name]) {
        this.players[name] = {
          online,
          lastChange: this.status == 'init' && !online ? null : newChange,
        };
        console.log(`We just learned about ${name}`);
      } else {
        const lastOnline = this.players[name].online;
        const lastChange = this.players[name].lastChange;

        this.players[name].online = online;

        if (lastOnline !== online) {
          this.players[name].lastChange = newChange;

          console.log(
            `${name} is now ${online ? 'online' : 'offline'} ${lastChange === null ? 'for the first time this session' : `after ${((newChange - lastChange) / 1000 / 60 / 60).toFixed(1)} hours`}`,
          );
        }
      }
    });

    this.paused = paused;
  }
}
