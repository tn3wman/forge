import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFileWatcher } from '../useFileWatcher';

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

vi.mock('../../ipc', () => ({
  fsIpc: {
    startWatcher: vi.fn().mockResolvedValue(undefined),
    stopWatcher: vi.fn().mockResolvedValue(undefined),
    readDirectory: vi.fn(),
  },
}));

import { listen } from '@tauri-apps/api/event';
import { fsIpc } from '../../ipc';

describe('useFileWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts watcher on mount and stops on unmount', () => {
    const { unmount } = renderHook(() => useFileWatcher('bay-1', '/project'));
    expect(fsIpc.startWatcher).toHaveBeenCalledWith('bay-1', '/project');
    expect(listen).toHaveBeenCalledWith('fs-change', expect.any(Function));
    unmount();
    expect(fsIpc.stopWatcher).toHaveBeenCalledWith('bay-1');
  });

  it('does nothing when bayId is null', () => {
    renderHook(() => useFileWatcher(null, null));
    expect(fsIpc.startWatcher).not.toHaveBeenCalled();
  });
});
