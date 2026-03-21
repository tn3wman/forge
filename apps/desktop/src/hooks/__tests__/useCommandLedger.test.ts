import { renderHook, waitFor } from '@testing-library/react';
import { useCommandLedger } from '../useCommandLedger';
import type { CommandEntry } from '@forge/core';

const mockQuery = vi.fn();
const mockListen = vi.fn(() => Promise.resolve(() => {}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => mockListen(...args),
}));

const mockCommand: CommandEntry = {
  id: 'cmd-1',
  bayId: 'bay-1',
  laneId: null,
  agentId: null,
  terminalId: null,
  command: 'echo hello',
  cwd: '/tmp',
  env: null,
  status: 'completed',
  exitCode: 0,
  startedAt: '2026-03-21T00:00:00Z',
  completedAt: '2026-03-21T00:00:01Z',
  durationMs: 1000,
  stdoutPreview: 'hello\n',
  stderrPreview: null,
  metadata: null,
};

describe('useCommandLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockResolvedValue([mockCommand]);
  });

  it('loads commands on mount', async () => {
    const { result } = renderHook(() => useCommandLedger('bay-1'));
    await waitFor(() => {
      expect(result.current.commands).toEqual([mockCommand]);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('passes filters to query', async () => {
    renderHook(() => useCommandLedger('bay-1', { status: 'completed' }));
    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith('command_ledger_query', {
        bayId: 'bay-1',
        status: 'completed',
      });
    });
  });
});
