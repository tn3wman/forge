import type { CommandFilters as Filters, CommandStatus } from '@forge/core';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function CommandFilters({ filters, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '4px 8px',
        borderBottom: '1px solid var(--border, #313244)',
      }}
    >
      <select
        value={filters.status ?? ''}
        onChange={(e) =>
          onChange({
            ...filters,
            status: (e.target.value || undefined) as CommandStatus | undefined,
          })
        }
        style={{
          fontSize: 11,
          background: 'var(--bg-secondary, #1e1e2e)',
          color: 'var(--text-primary, #cdd6f4)',
          border: '1px solid var(--border, #313244)',
          borderRadius: 3,
          padding: '2px 4px',
        }}
      >
        <option value="">All statuses</option>
        <option value="running">Running</option>
        <option value="completed">Completed</option>
        <option value="failed">Failed</option>
        <option value="killed">Killed</option>
      </select>
    </div>
  );
}
