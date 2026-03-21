import type { Bay } from '@forge/core';

interface LeftRailProps {
  bay: Bay;
}

export function LeftRail({ bay }: LeftRailProps) {
  return (
    <div style={{ padding: '1rem', fontFamily: 'system-ui' }}>
      <div
        style={{
          fontSize: '0.75rem',
          color: '#71717a',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Files
      </div>
      <div style={{ fontSize: '0.8rem', color: '#a1a1aa', fontFamily: 'ui-monospace, monospace' }}>
        {bay.projectPath}
      </div>
    </div>
  );
}
