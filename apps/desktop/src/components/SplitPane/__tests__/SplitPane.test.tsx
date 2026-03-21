import { render, screen } from '@testing-library/react';
import type { PaneNode } from '@forge/core';
import { SplitPane } from '../SplitPane';

vi.mock('@monaco-editor/react', () => ({
  default: (props: { language: string; theme: string }) => (
    <div data-testid="monaco-editor" data-language={props.language} data-theme={props.theme} />
  ),
}));

vi.mock('../../../ipc', () => ({
  fsIpc: {
    readFile: vi.fn().mockResolvedValue('file content'),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

const noop = () => {};

describe('SplitPane', () => {
  it('renders EditorPane for a leaf node', () => {
    const leaf: PaneNode = {
      type: 'leaf',
      id: 'p1',
      tabs: ['/a.ts'],
      activeTab: '/a.ts',
    };

    render(<SplitPane node={leaf} onSelectTab={noop} onCloseTab={noop} onSplitPane={noop} />);

    expect(screen.getByTestId('editor-pane-p1')).toBeDefined();
    // TabBar should show the file tab
    expect(screen.getByRole('tab')).toBeDefined();
  });

  it('renders two children with resize handle for a split node', () => {
    const split: PaneNode = {
      type: 'split',
      direction: 'vertical',
      ratio: 0.5,
      children: [
        { type: 'leaf', id: 'left', tabs: [], activeTab: null },
        { type: 'leaf', id: 'right', tabs: [], activeTab: null },
      ],
    };

    render(<SplitPane node={split} onSelectTab={noop} onCloseTab={noop} onSplitPane={noop} />);

    expect(screen.getByTestId('editor-pane-left')).toBeDefined();
    expect(screen.getByTestId('editor-pane-right')).toBeDefined();
    expect(screen.getByRole('separator')).toBeDefined();
    expect(screen.getByTestId('split-container').getAttribute('data-direction')).toBe('vertical');
  });

  it('renders horizontal split correctly', () => {
    const split: PaneNode = {
      type: 'split',
      direction: 'horizontal',
      ratio: 0.6,
      children: [
        { type: 'leaf', id: 'top', tabs: [], activeTab: null },
        { type: 'leaf', id: 'bottom', tabs: [], activeTab: null },
      ],
    };

    render(<SplitPane node={split} onSelectTab={noop} onCloseTab={noop} onSplitPane={noop} />);

    expect(screen.getByTestId('split-container').getAttribute('data-direction')).toBe('horizontal');
    expect(screen.getByTestId('editor-pane-top')).toBeDefined();
    expect(screen.getByTestId('editor-pane-bottom')).toBeDefined();
  });
});
