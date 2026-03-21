import { useState, useEffect, useCallback } from 'react';
import type { Bay, Lane } from '@forge/core';
import { bayIpc, laneIpc } from './ipc';
import { useNavigation } from './context/NavigationContext';
import { Harbor } from './screens/Harbor';
import { BayWorkspace } from './screens/Bay';

export function App() {
  const { screen, openBay, openHarbor } = useNavigation();
  const [bays, setBays] = useState<Bay[]>([]);
  const [lanes, setLanes] = useState<Lane[]>([]);

  const refreshData = useCallback(() => {
    bayIpc.list().then(setBays);
    laneIpc.listAll().then(setLanes);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleOpenFolder = useCallback(async () => {
    const bay = await bayIpc.openFolder();
    if (bay) {
      refreshData();
      openBay(bay.id);
    }
  }, [refreshData, openBay]);

  if (screen.type === 'harbor') {
    return <Harbor bays={bays} lanes={lanes} onOpenBay={openBay} onOpenFolder={handleOpenFolder} />;
  }

  return <BayWorkspace bayId={screen.bayId} onBack={openHarbor} />;
}
