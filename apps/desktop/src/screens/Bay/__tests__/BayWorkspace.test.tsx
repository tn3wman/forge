import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BayWorkspace } from '../BayWorkspace';

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));

vi.mock('../../../ipc', () => ({
  bayIpc: {
    open: vi.fn().mockResolvedValue({
      id: 'bay-1',
      name: 'my-project',
      projectPath: '/home/user/my-project',
      gitBranch: 'main',
      status: 'active',
      windowState: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      lastAccessedAt: '2026-01-01T00:00:00Z',
    }),
    updateWindowState: vi.fn().mockResolvedValue(undefined),
  },
  fsIpc: {
    readDirectory: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
    startWatcher: vi.fn().mockResolvedValue(undefined),
    stopWatcher: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('BayWorkspace', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bay name after loading', async () => {
    render(<BayWorkspace bayId="bay-1" onBack={mockOnBack} />);
    await waitFor(() => {
      expect(screen.getByText('my-project')).toBeDefined();
    });
  });

  it('renders three layout panels', async () => {
    render(<BayWorkspace bayId="bay-1" onBack={mockOnBack} />);
    await waitFor(() => {
      expect(screen.getByTestId('left-rail')).toBeDefined();
      expect(screen.getByTestId('center-panel')).toBeDefined();
      expect(screen.getByTestId('right-rail')).toBeDefined();
    });
  });

  it('shows back button that calls onBack', async () => {
    render(<BayWorkspace bayId="bay-1" onBack={mockOnBack} />);
    await waitFor(() => {
      const backBtn = screen.getByRole('button', { name: /harbor/i });
      backBtn.click();
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  it('calls bayIpc.open on mount', async () => {
    const { bayIpc } = await import('../../../ipc');
    render(<BayWorkspace bayId="bay-1" onBack={mockOnBack} />);
    await waitFor(() => {
      expect(bayIpc.open).toHaveBeenCalledWith('bay-1');
    });
  });
});
