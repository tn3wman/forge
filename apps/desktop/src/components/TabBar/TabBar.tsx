import styles from './TabBar.module.css';

interface TabBarProps {
  tabs: string[];
  activeTab: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function TabBar({ tabs, activeTab, onSelect, onClose }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className={styles.tabBar}>
      {tabs.map((path) => (
        <div
          key={path}
          className={styles.tab}
          data-active={path === activeTab ? 'true' : 'false'}
          onClick={() => onSelect(path)}
          title={path}
          role="tab"
          aria-selected={path === activeTab}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelect(path);
          }}
        >
          <span className={styles.tabName}>{fileName(path)}</span>
          <button
            className={styles.closeBtn}
            aria-label={`Close ${fileName(path)}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose(path);
            }}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
