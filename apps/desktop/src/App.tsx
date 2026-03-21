import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function App() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    invoke<string>('greet', { name: 'Forge' }).then(setGreeting);
  }, []);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Forge</h1>
      <p>{greeting || 'Loading...'}</p>
    </main>
  );
}
