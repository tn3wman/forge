import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLsp } from '../useLsp';

const mockListen = vi.fn();
const mockUnlisten = vi.fn();

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

vi.mock('../../ipc', () => ({
  lspIpc: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    stopAll: vi.fn().mockResolvedValue(undefined),
    didOpen: vi.fn().mockResolvedValue(undefined),
    didChange: vi.fn().mockResolvedValue(undefined),
  },
}));

import { lspIpc } from '../../ipc';

describe('useLsp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(mockUnlisten);
  });

  it('does nothing when bayId is null', () => {
    renderHook(() => useLsp(null, null));
    expect(lspIpc.start).not.toHaveBeenCalled();
  });

  it('starts LSP server on mount', async () => {
    renderHook(() => useLsp('bay-1', '/project'));
    await waitFor(() => {
      expect(lspIpc.start).toHaveBeenCalledWith('bay-1', 'typescript', '/project');
    });
  });

  it('listens for diagnostics events', async () => {
    renderHook(() => useLsp('bay-1', '/project'));
    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledWith('lsp:diagnostics', expect.any(Function));
    });
  });

  it('stops LSP on unmount', async () => {
    const { unmount } = renderHook(() => useLsp('bay-1', '/project'));
    unmount();
    await waitFor(() => {
      expect(lspIpc.stopAll).toHaveBeenCalledWith('bay-1');
    });
  });
});
