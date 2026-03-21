import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FileTree } from '../FileTree';

vi.mock('../../../ipc', () => ({
  fsIpc: {
    readDirectory: vi.fn(),
  },
}));

import { fsIpc } from '../../../ipc';

const mockEntries = [
  { name: 'src', path: '/project/src', isDir: true, isSymlink: false },
  { name: 'README.md', path: '/project/README.md', isDir: false, isSymlink: false },
];

describe('FileTree', () => {
  beforeEach(() => {
    vi.mocked(fsIpc.readDirectory).mockResolvedValue(mockEntries);
  });

  it('loads and renders top-level entries', async () => {
    render(<FileTree rootPath="/project" onFileSelect={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('src')).toBeDefined();
      expect(screen.getByText('README.md')).toBeDefined();
    });
    expect(fsIpc.readDirectory).toHaveBeenCalledWith('/project', false);
  });

  it('calls onFileSelect when a file is clicked', async () => {
    const onFileSelect = vi.fn();
    render(<FileTree rootPath="/project" onFileSelect={onFileSelect} />);
    await waitFor(() => screen.getByText('README.md'));
    screen.getByText('README.md').click();
    expect(onFileSelect).toHaveBeenCalledWith('/project/README.md');
  });

  it('does not call onFileSelect when a directory is clicked', async () => {
    const onFileSelect = vi.fn();
    render(<FileTree rootPath="/project" onFileSelect={onFileSelect} />);
    await waitFor(() => screen.getByText('src'));
    screen.getByText('src').click();
    expect(onFileSelect).not.toHaveBeenCalled();
  });

  it('expands a directory on click and loads children', async () => {
    const childEntries = [
      { name: 'index.ts', path: '/project/src/index.ts', isDir: false, isSymlink: false },
    ];
    vi.mocked(fsIpc.readDirectory)
      .mockResolvedValueOnce(mockEntries)
      .mockResolvedValueOnce(childEntries);

    render(<FileTree rootPath="/project" onFileSelect={() => {}} />);
    await waitFor(() => screen.getByText('src'));
    screen.getByText('src').click();

    await waitFor(() => {
      expect(screen.getByText('index.ts')).toBeDefined();
    });
    expect(fsIpc.readDirectory).toHaveBeenCalledWith('/project/src', false);
  });

  it('collapses an expanded directory on second click', async () => {
    const childEntries = [
      { name: 'index.ts', path: '/project/src/index.ts', isDir: false, isSymlink: false },
    ];
    vi.mocked(fsIpc.readDirectory)
      .mockResolvedValueOnce(mockEntries)
      .mockResolvedValueOnce(childEntries);

    render(<FileTree rootPath="/project" onFileSelect={() => {}} />);
    await waitFor(() => screen.getByText('src'));
    screen.getByText('src').click();
    await waitFor(() => screen.getByText('index.ts'));
    screen.getByText('src').click();
    await waitFor(() => {
      expect(screen.queryByText('index.ts')).toBeNull();
    });
  });

  it('does not re-fetch cached directory on re-expand', async () => {
    const childEntries = [
      { name: 'index.ts', path: '/project/src/index.ts', isDir: false, isSymlink: false },
    ];
    vi.mocked(fsIpc.readDirectory)
      .mockResolvedValueOnce(mockEntries)
      .mockResolvedValueOnce(childEntries);

    render(<FileTree rootPath="/project" onFileSelect={() => {}} />);
    await waitFor(() => screen.getByText('src'));
    screen.getByText('src').click();
    await waitFor(() => screen.getByText('index.ts'));
    screen.getByText('src').click();
    screen.getByText('src').click();
    await waitFor(() => screen.getByText('index.ts'));
    expect(fsIpc.readDirectory).toHaveBeenCalledTimes(2);
  });
});
