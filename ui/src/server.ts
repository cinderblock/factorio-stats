const host = 'http://' + window.location.host;
// const host = 'http://localhost:3000';

export function sendFactoryGrowth(name: string) {
  fetch(host + '/grow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));
}

/*
      status: this.status,
      version: this.version,
      time: this.time,
      seed: this.seed,
      players: { ...this.players },
      evolution: { ...this.evolution },
*/

export type FactoryStats = {
  status: 'connected' | 'disconnected';
  version: string;
  time: string;
  seed: string;
  players: { [name: string]: null | number };
  evolution: {
    [planet: string]: {
      factor: number;
      time: number;
      pollution: number;
      kills: number;
    };
  };
};

export function getFactoryStats(): Promise<FactoryStats> {
  return fetch(host + '/status')
    .then(response => response.json())
    .catch(error => console.error(error));
}
