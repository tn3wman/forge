import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { bayIpc } from './ipc';
import type { Bay } from '@forge/core';

export function App() {
  const [greeting, setGreeting] = useState('');
  const [bays, setBays] = useState<Bay[]>([]);

  useEffect(() => {
    invoke<string>('greet', { name: 'Forge' }).then(setGreeting);
    bayIpc.list().then(setBays);
  }, []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Forge</h1>
      <p>{greeting || 'Loading...'}</p>
      <h2>Bays ({bays.length})</h2>
      {bays.length === 0 ? (
        <p style={{ color: '#71717a' }}>No projects open</p>
      ) : (
        <ul>
          {bays.map((bay) => (
            <li key={bay.id}>{bay.name} — {bay.projectPath}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
