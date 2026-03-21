import type { Bay, Lane } from '@forge/core';
import styles from './Harbor.module.css';

interface ProjectCardProps {
  bay: Bay;
  lanes: Lane[];
  index: number;
  selected: boolean;
  onSelect: (bayId: string) => void;
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProjectCard({ bay, lanes, index, selected, onSelect }: ProjectCardProps) {
  const activeLanes = lanes.filter((l) => l.status === 'running' || l.status === 'planning');
  const pendingLanes = lanes.filter((l) => l.status === 'awaiting_approval');

  return (
    <div
      className={styles.projectCard}
      data-selected={selected}
      data-status={bay.status}
      onClick={() => onSelect(bay.id)}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
    >
      <div className={styles.projectCardHeader}>
        <span className={styles.projectIndex}>{index + 1}</span>
        <span className={styles.projectName}>{bay.name}</span>
        {bay.gitBranch && <span className={styles.branchBadge}>{bay.gitBranch}</span>}
      </div>
      <div className={styles.projectMeta}>
        <span className={styles.projectPath}>{bay.projectPath}</span>
        <span className={styles.lastActivity}>{formatRelativeTime(bay.lastAccessedAt)}</span>
      </div>
      <div className={styles.projectStats}>
        {activeLanes.length > 0 && (
          <span className={styles.statActive}>{activeLanes.length} active</span>
        )}
        {pendingLanes.length > 0 && (
          <span className={styles.statPending}>{pendingLanes.length} pending</span>
        )}
        {activeLanes.length === 0 && pendingLanes.length === 0 && lanes.length > 0 && (
          <span className={styles.statIdle}>{lanes.length} lanes</span>
        )}
      </div>
    </div>
  );
}
