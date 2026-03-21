import { render, screen } from '@testing-library/react';
import { Harbor } from '../Harbor';
import type { Bay, Lane } from '@forge/core';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockBays: Bay[] = [
  {
    id: 'bay-1',
    name: 'forge',
    projectPath: '/projects/forge',
    gitBranch: 'main',
    status: 'active',
    windowState: null,
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-20T12:00:00Z',
    lastAccessedAt: '2026-03-21T08:30:00Z',
  },
  {
    id: 'bay-2',
    name: 'api',
    projectPath: '/projects/api',
    gitBranch: 'feat/auth',
    status: 'active',
    windowState: null,
    createdAt: '2026-03-19T10:00:00Z',
    updatedAt: '2026-03-20T12:00:00Z',
    lastAccessedAt: '2026-03-20T15:00:00Z',
  },
];

const mockLanes: Lane[] = [
  {
    id: 'l1',
    bayId: 'bay-1',
    goal: 'Fix auth',
    status: 'running',
    agentId: null,
    modelId: null,
    fileScope: { readPatterns: [], writePatterns: [] },
    checkpoints: [],
    createdAt: '',
    updatedAt: '',
  },
];

describe('Harbor', () => {
  it('renders harbor title', () => {
    render(
      <Harbor bays={mockBays} lanes={mockLanes} onOpenBay={() => {}} onOpenFolder={() => {}} />,
    );
    expect(screen.getByText('Harbor')).toBeDefined();
  });

  it('renders project count', () => {
    render(
      <Harbor bays={mockBays} lanes={mockLanes} onOpenBay={() => {}} onOpenFolder={() => {}} />,
    );
    expect(screen.getByText('2 projects')).toBeDefined();
  });

  it('renders each project name', () => {
    render(
      <Harbor bays={mockBays} lanes={mockLanes} onOpenBay={() => {}} onOpenFolder={() => {}} />,
    );
    expect(screen.getByText('forge')).toBeDefined();
    expect(screen.getByText('api')).toBeDefined();
  });

  it('shows empty state when no bays', () => {
    render(<Harbor bays={[]} lanes={[]} onOpenBay={() => {}} onOpenFolder={() => {}} />);
    expect(screen.getByText('No projects open')).toBeDefined();
  });
});
