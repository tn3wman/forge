import { useCallback, useMemo } from 'react';
import type { Bay, Lane } from '@forge/core';
import { ProjectCard } from './ProjectCard';
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation';
import { useHotkeys } from '../../hooks/useHotkeys';
import styles from './Harbor.module.css';

interface HarborProps {
  bays: Bay[];
  lanes: Lane[];
  onOpenBay: (bayId: string) => void;
  onOpenFolder: () => void;
}

export function Harbor({ bays, lanes, onOpenBay, onOpenFolder }: HarborProps) {
  const lanesByBay = useMemo(() => {
    const map = new Map<string, Lane[]>();
    for (const lane of lanes) {
      const existing = map.get(lane.bayId) ?? [];
      existing.push(lane);
      map.set(lane.bayId, existing);
    }
    return map;
  }, [lanes]);

  const handleActivate = useCallback(
    (index: number) => {
      const bay = bays[index];
      if (bay) onOpenBay(bay.id);
    },
    [bays, onOpenBay],
  );

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: bays.length,
    onActivate: handleActivate,
  });

  useHotkeys({
    itemCount: Math.min(bays.length, 9),
    onSelect: handleActivate,
  });

  return (
    <div className={styles.harbor}>
      <div className={styles.harborHeader}>
        <h1 className={styles.harborTitle}>Harbor</h1>
        <span className={styles.harborCount}>
          {bays.length} {bays.length === 1 ? 'project' : 'projects'}
        </span>
        <button className={styles.openFolderButton} onClick={onOpenFolder}>
          + Open Folder
        </button>
      </div>

      {bays.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyTitle}>No projects open</span>
          <span className={styles.emptyHint}>Open a project folder to get started</span>
        </div>
      ) : (
        <div className={styles.projectList} role="listbox" aria-label="Projects">
          {bays.map((bay, index) => (
            <ProjectCard
              key={bay.id}
              bay={bay}
              lanes={lanesByBay.get(bay.id) ?? []}
              index={index}
              selected={index === selectedIndex}
              onSelect={onOpenBay}
            />
          ))}
        </div>
      )}

      <div className={styles.harborFooter}>
        <span>
          <span className={styles.shortcutKey}>↑↓</span> navigate
        </span>
        <span>
          <span className={styles.shortcutKey}>Enter</span> open
        </span>
        <span>
          <span className={styles.shortcutKey}>⌘1-9</span> quick switch
        </span>
      </div>
    </div>
  );
}
