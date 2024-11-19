import { useEffect, useState } from 'react';
import { FactoryStats, getFactoryStats } from './server';
import Nauvis from './assets/factorio/Nauvis.png';
import Vulcanus from './assets/factorio/Vulcanus.png';
import Fulgora from './assets/factorio/Fulgora.png';
import Gleba from './assets/factorio/Gleba.png';
import Aquilo from './assets/factorio/Aquilo.png';
import Shattered_Planet from './assets/factorio/Shattered_Planet.png';

const planetImages = {
  Nauvis,
  Vulcanus,
  Fulgora,
  Gleba,
  Aquilo,
  Shattered_Planet,
};

export default function FactoryStatus() {
  const [stats, setStats] = useState<FactoryStats | null>(null);

  useEffect(() => {
    function update() {
      getFactoryStats().then(setStats);
    }
    update();
    const interval = setInterval(update, 1000 * 0.5);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return <div>Loading...</div>;
  }

  if (stats.status === 'disconnected') {
    return <div>Disconnected</div>;
  }

  if (stats.status !== 'connected') {
    return <div>WTF?</div>;
  }

  const players = Object.keys(stats.players).sort((a, b) => {
    if (stats.players[a].online != stats.players[b].online) {
      return stats.players[a].online ? -1 : 1;
    }
    if (stats.players[a].lastChange === null) {
      return 1; // a is new
    }
    if (stats.players[b].lastChange === null) {
      return -1; // b is new
    }
    const diff = stats.players[a].lastChange - stats.players[b].lastChange;

    return stats.players[a].online ? diff : -diff;
  });

  const playerHours = players.map(player => {
    if (stats.players[player].lastChange === null) {
      return null;
    }
    return (Date.now() - stats.players[player].lastChange) / 1000 / 60 / 60;
  });

  const maxPlayerHours = playerHours.reduce((a, b) => Math.max(a ?? 0, b ?? 0), 0)!;

  const playerHoursDecimalPlaces = 1;
  const playerHoursPrintedDigitsBeforeDecimal = Math.floor(Math.log(Math.max(1, maxPlayerHours)) / Math.log(10)) + 1;

  const playerHoursFinalStrLength =
    playerHoursPrintedDigitsBeforeDecimal +
    1 + // decimal point
    playerHoursDecimalPlaces;

  const planets = Object.keys(stats.evolution);

  return (
    <div>
      <h2>Factory Status</h2>
      <div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const numHours = playerHours[index];

                let hours: JSX.Element | string | null = null;

                if (numHours === null) {
                  hours = <i>Unknown</i>;
                } else {
                  hours = numHours.toFixed(playerHoursDecimalPlaces);

                  const neededDigits = playerHoursFinalStrLength - hours.length;

                  hours += ' hours';

                  if (neededDigits > 0) {
                    hours = (
                      <>
                        <span style={{ userSelect: 'none' }}>{'\u2007'.repeat(neededDigits)}</span>
                        {hours}
                      </>
                    );
                  }
                }

                const status = (
                  <span title={stats.players[player].online ? 'Online' : 'Offline'}>
                    {stats.players[player].online ? '🟢' : '🔴'}
                  </span>
                );

                return (
                  <tr key={player}>
                    <td>{player}</td>
                    <td align="left">
                      {status} {hours}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <table>
            <thead>
              <tr>
                <th>{/* Icon */}</th>
                <th>Planet</th>
                <th>Factor</th>
                <th>Time</th>
                <th>Pollution</th>
                <th>Kills</th>
              </tr>
            </thead>
            <tbody>
              {planets.map(planet => (
                <tr key={planet}>
                  <td>
                    <img src={planetImages[planet as keyof typeof planetImages]} alt={planet} height="20em" />
                  </td>
                  <td>{planet}</td>
                  <td>{stats.evolution[planet].factor.toFixed(4)}</td>
                  <td>{toPercent(stats.evolution[planet].time)}</td>
                  <td>{toPercent(stats.evolution[planet].pollution)}</td>
                  <td>{toPercent(stats.evolution[planet].kills)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>Factory Age</h3>
          {typeof stats.time === 'number' ? `${stats.time.toFixed(1)} hours` : stats.time}
          <h3>Version</h3>
          {stats.version}
          <h3>Seed</h3>
          {stats.seed}
        </div>
      </div>
    </div>
  );
}

function toPercent(n: number, digits = 0) {
  const figureSpace = '\u2007';
  return ((n * 100).toFixed(digits) + '%').padStart(4 + digits, figureSpace);
}
