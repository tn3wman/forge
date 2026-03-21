import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabBar } from '../TabBar';

describe('TabBar', () => {
  it('renders tab names from file paths', () => {
    render(
      <TabBar
        tabs={['/project/src/index.ts', '/project/README.md']}
        activeTab="/project/src/index.ts"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('index.ts')).toBeDefined();
    expect(screen.getByText('README.md')).toBeDefined();
  });

  it('highlights the active tab', () => {
    render(
      <TabBar
        tabs={['/project/src/index.ts', '/project/README.md']}
        activeTab="/project/src/index.ts"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    const activeTab = screen.getByText('index.ts').closest('button');
    expect(activeTab?.getAttribute('data-active')).toBe('true');
  });

  it('calls onSelect when a tab is clicked', () => {
    const onSelect = vi.fn();
    render(
      <TabBar
        tabs={['/project/src/index.ts', '/project/README.md']}
        activeTab="/project/src/index.ts"
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    screen.getByText('README.md').click();
    expect(onSelect).toHaveBeenCalledWith('/project/README.md');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <TabBar
        tabs={['/project/src/index.ts']}
        activeTab="/project/src/index.ts"
        onSelect={() => {}}
        onClose={onClose}
      />,
    );
    const closeBtn = screen.getByLabelText('Close index.ts');
    closeBtn.click();
    expect(onClose).toHaveBeenCalledWith('/project/src/index.ts');
  });

  it('renders nothing when tabs array is empty', () => {
    const { container } = render(
      <TabBar tabs={[]} activeTab={null} onSelect={() => {}} onClose={() => {}} />,
    );
    expect(container.querySelector('[class*="tabBar"]')).toBeNull();
  });
});
