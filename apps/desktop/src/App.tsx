import { useState, useEffect } from 'react';
import type { Bay, Lane } from '@forge/core';
import { bayIpc, laneIpc } from './ipc';
import { useNavigation } from './context/NavigationContext';
import { Harbor } from './screens/Harbor';

export function App() {
  const { screen, openBay, openHarbor } = useNavigation();
  const [bays, setBays] = useState<Bay[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);

  useEffect(() => {
    bayIpc.list().then(setBays);
    laneIpc.listAll().then(setLanes);
  }, []);

  if (screen.type === 'harbor') {
    return <Harbor bays={bays} lanes={lanes} onOpenBay={openBay} />;
  }

  // Placeholder Bay view — will be replaced in later tasks
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <button onClick={openHarbor} style={{ marginBottom: '1rem', cursor: 'pointer' }}>
        ← Harbor
      </button>
      <h2>Bay: {bays.find((b) => b.id === screen.bayId)?.name ?? screen.bayId}</h2>
      <p style={{ color: '#71717a' }}>Bay workspace coming in Phase 1.06+</p>
    </div>
  );
}
