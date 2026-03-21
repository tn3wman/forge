import type { DirEntry } from '@forge/core';
import styles from './FileTree.module.css';

interface FileTreeItemProps {
  entry: DirEntry;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

export function FileTreeItem({ entry, depth, isExpanded, onToggle, onSelect }: FileTreeItemProps) {
  const handleClick = () => {
    if (entry.isDir) {
      onToggle();
    } else {
      onSelect();
    }
  };

  return (
    <button
      className={styles.item}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={handleClick}
      title={entry.path}
      type="button"
    >
      <span className={styles.icon}>{entry.isDir ? (isExpanded ? '▼' : '▶') : ' '}</span>
      <span className={styles.name}>{entry.name}</span>
    </button>
  );
}
