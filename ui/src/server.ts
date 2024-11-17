const host = 'https://' + window.location.host;
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

export type FactoryStats = {
  status: 'init' | 'connected' | 'disconnected';
  version: string;
  time: string | number;
  seed: string;
  players: {
    [name: string]: {
      lastChange: number | null; // Null means we haven't seen them yet this runtime instance
      online: boolean;
    };
  };
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
