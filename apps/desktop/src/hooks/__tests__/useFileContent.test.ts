import { renderHook, waitFor } from '@testing-library/react';
import { useFileContent } from '../useFileContent';

vi.mock('../../ipc', () => ({
  fsIpc: {
    readFile: vi.fn(),
  },
}));

import { fsIpc } from '../../ipc';

describe('useFileContent', () => {
  it('returns null content when no filePath', () => {
    const { result } = renderHook(() => useFileContent(null));
    expect(result.current.content).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('loads file content for given path', async () => {
    vi.mocked(fsIpc.readFile).mockResolvedValue('file contents');
    const { result } = renderHook(() => useFileContent('/path/file.ts'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.content).toBe('file contents');
  });

  it('caches content and does not re-fetch', async () => {
    vi.mocked(fsIpc.readFile).mockResolvedValue('cached');
    const { result, rerender } = renderHook(({ path }) => useFileContent(path), {
      initialProps: { path: '/path/file.ts' as string | null },
    });
    await waitFor(() => expect(result.current.content).toBe('cached'));
    rerender({ path: null });
    rerender({ path: '/path/file.ts' });
    expect(fsIpc.readFile).toHaveBeenCalledTimes(1);
  });

  it('returns error on read failure', async () => {
    vi.mocked(fsIpc.readFile).mockRejectedValue(new Error('not found'));
    const { result } = renderHook(() => useFileContent('/bad/path'));
    await waitFor(() => expect(result.current.error).toBe('not found'));
  });
});
