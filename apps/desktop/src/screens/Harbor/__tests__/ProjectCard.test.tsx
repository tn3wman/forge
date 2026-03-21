import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '../ProjectCard';
import type { Bay, Lane } from '@forge/core';

const mockBay: Bay = {
  id: 'bay-1',
  name: 'forge',
  projectPath: '/Users/test/forge',
  gitBranch: 'main',
  status: 'active',
  windowState: {
    x: 0,
    y: 0,
    width: 1200,
    height: 800,
    isMaximized: false,
    leftRailWidth: 250,
    rightRailWidth: 300,
    bottomTrayHeight: 200,
    openTabs: [],
    activeTab: null,
  },
  createdAt: '2026-03-20T10:00:00Z',
  updatedAt: '2026-03-20T12:00:00Z',
  lastAccessedAt: '2026-03-21T08:30:00Z',
};

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
  {
    id: 'l2',
    bayId: 'bay-1',
    goal: 'Add tests',
    status: 'awaiting_approval',
    agentId: null,
    modelId: null,
    fileScope: { readPatterns: [], writePatterns: [] },
    checkpoints: [],
    createdAt: '',
    updatedAt: '',
  },
];

describe('ProjectCard', () => {
  it('renders project name', () => {
    render(<ProjectCard bay={mockBay} lanes={[]} index={0} selected={false} onSelect={() => {}} />);
    expect(screen.getByText('forge')).toBeDefined();
  });

  it('renders git branch', () => {
    render(<ProjectCard bay={mockBay} lanes={[]} index={0} selected={false} onSelect={() => {}} />);
    expect(screen.getByText('main')).toBeDefined();
  });

  it('shows active lane count', () => {
    render(
      <ProjectCard
        bay={mockBay}
        lanes={mockLanes}
        index={0}
        selected={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(/1 active/)).toBeDefined();
  });

  it('shows pending approval count', () => {
    render(
      <ProjectCard
        bay={mockBay}
        lanes={mockLanes}
        index={0}
        selected={false}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(/1 pending/)).toBeDefined();
  });

  it('applies selected styling via data attribute', () => {
    const { container } = render(
      <ProjectCard bay={mockBay} lanes={[]} index={0} selected={true} onSelect={() => {}} />,
    );
    const card = container.firstElementChild!;
    expect(card.getAttribute('data-selected')).toBe('true');
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<ProjectCard bay={mockBay} lanes={[]} index={0} selected={false} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('forge'));
    expect(onSelect).toHaveBeenCalledWith('bay-1');
  });
});
