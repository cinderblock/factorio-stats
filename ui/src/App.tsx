import { useState } from 'react';
import spaceAge from './assets/press-kit-space-age/logos/factorio-space-age-logo-web.png';
import './App.css';

import FactoryStats from './FactoryStatus.tsx';
import { sendFactoryGrowth } from './server';

function App() {
  const [name, setName] = useState('');

  return (
    <>
      <div>
        <h1>Blake, Cameron, and Andrew's</h1>
        <a href="https://www.factorio.com/" target="_blank">
          <img src={spaceAge} className="logo" alt="Factorio Space Age logo" />
        </a>
      </div>
      <div className="card">
        <FactoryStats />
      </div>
      <div className="card">
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
        <br />
        <button onClick={() => sendFactoryGrowth(name)}>The Factory Must Grow!</button>
      </div>
    </>
  );
}

export default App;
