import type { Bay } from '@forge/core';
import { FileTree } from '../../components/FileTree';

interface LeftRailProps {
  bay: Bay;
  onFileSelect: (path: string) => void;
  refreshKey?: number;
}

export function LeftRail({ bay, onFileSelect, refreshKey }: LeftRailProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '8px 12px',
          fontSize: '0.7rem',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          borderBottom: '1px solid #27272a',
          flexShrink: 0,
        }}
      >
        Files
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        <FileTree rootPath={bay.projectPath} onFileSelect={onFileSelect} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
