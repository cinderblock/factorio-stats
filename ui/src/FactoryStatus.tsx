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

  if (stats.status === 'init') {
    return <div>Initializing connection to Factorio server</div>;
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

  const playerHoursPrintedDigitsBeforeDecimal = Math.floor(Math.log(Math.max(1, maxPlayerHours)) / Math.log(10)) + 1;

  const maxLastSessionHours = players.reduce<number | undefined>(
    (max, player) =>
      stats.players[player].lastOnlineDuration === max
        ? max
        : Math.max(max ?? 0, stats.players[player].lastOnlineDuration ?? 0),
    undefined,
  );
  const lastSessionHoursPrintedDigitsBeforeDecimal =
    maxLastSessionHours && Math.floor(Math.log(Math.max(1, maxLastSessionHours)) / Math.log(10)) + 1;

  const planets = Object.keys(stats.evolution);

  return (
    <div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Status</th>
                {lastSessionHoursPrintedDigitsBeforeDecimal === undefined ? null : <th>Last Session</th>}
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => {
                const numHours = playerHours[index];

                let hours: JSX.Element | string | null = null;

                if (numHours === null) {
                  hours = <i>Unknown</i>;
                } else {
                  hours = <DurationDisplay hours={numHours} minDigits={playerHoursPrintedDigitsBeforeDecimal} />;
                }

                const status = (
                  <span title={stats.players[player].online ? 'Online' : 'Offline'}>
                    {stats.players[player].online ? '🟢' : '🔴'}
                  </span>
                );

                return (
                  <tr key={player}>
                    <td align="left">{player}</td>
                    <td align="left">
                      {status} {hours}
                    </td>
                    {lastSessionHoursPrintedDigitsBeforeDecimal === undefined ? null : (
                      <td align="left">
                        {stats.players[player].lastOnlineDuration ? (
                          <>
                            <span title="Was Online for..." style={{ opacity: 0.5 }}>
                              🟢
                            </span>{' '}
                            <DurationDisplay
                              hours={stats.players[player].lastOnlineDuration}
                              minDigits={lastSessionHoursPrintedDigitsBeforeDecimal}
                            />
                          </>
                        ) : null}
                      </td>
                    )}
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
                  <td align="left">{planet}</td>
                  <td align="right">{stats.evolution[planet].factor.toFixed(4)}</td>
                  <td align="right">{toPercent(stats.evolution[planet].time)}</td>
                  <td align="right">{toPercent(stats.evolution[planet].pollution)}</td>
                  <td align="right">{toPercent(stats.evolution[planet].kills)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <table>
            <tbody>
              <tr>
                <td align="left">
                  <strong>Factory Age</strong>
                </td>
                <td align="left">
                  {typeof stats.time === 'number' ? <DurationDisplay hours={stats.time} /> : stats.time}
                </td>
              </tr>
              <tr>
                <td align="left">
                  <strong>Version</strong>
                </td>
                <td align="left">{stats.version}</td>
              </tr>
              <tr>
                <td align="left">
                  <strong>Seed</strong>
                </td>
                <td align="left">{stats.seed}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function toPercent(n: number, digits = 0) {
  const figureSpace = '\u2007';
  return ((n * 100).toFixed(digits) + '%').padStart(4 + digits, figureSpace);
}

const playerHoursDecimalPlaces = 1;

function DurationDisplay({
  hours,
  minDigits,
  decimalPlaces,
}: {
  hours: number;
  minDigits?: number; // Minimum number of digits to display before the decimal point
  decimalPlaces?: number; // Number of decimal places to display
}): JSX.Element | string {
  decimalPlaces ??= playerHoursDecimalPlaces;
  minDigits ??= 1;

  let ret: JSX.Element | string = hours.toFixed(decimalPlaces);

  const neededDigits = minDigits + 1 + decimalPlaces - ret.length;

  ret += ' hours';

  if (neededDigits > 0) {
    ret = (
      <>
        <span style={{ userSelect: 'none' }}>{'\u2007'.repeat(neededDigits)}</span>
        {ret}
      </>
    );
  }
  return ret;
}
