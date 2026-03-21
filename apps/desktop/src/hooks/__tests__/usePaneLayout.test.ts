import { renderHook, act } from '@testing-library/react';
import type { PaneNode } from '@forge/core';
import { usePaneLayout, paneReducer, firstLeaf } from '../usePaneLayout';

// Use a deterministic UUID counter for tests
let uuidCounter = 0;
beforeEach(() => {
  uuidCounter = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    uuidCounter++;
    return `uuid-${uuidCounter}` as ReturnType<typeof crypto.randomUUID>;
  });
});

function makeLeaf(
  id: string,
  tabs: string[] = [],
  activeTab: string | null = null,
): PaneNode & { type: 'leaf' } {
  return { type: 'leaf', id, tabs, activeTab };
}

describe('usePaneLayout', () => {
  it('initializes with provided layout', () => {
    const initial = makeLeaf('p1', ['/a.ts'], '/a.ts');
    const { result } = renderHook(() => usePaneLayout(initial));
    expect(result.current.layout).toEqual(initial);
  });

  it('opens file in correct pane', () => {
    const initial = makeLeaf('p1');
    const { result } = renderHook(() => usePaneLayout(initial));

    act(() => result.current.openFile('p1', '/file.ts'));

    expect(result.current.layout).toEqual({
      type: 'leaf',
      id: 'p1',
      tabs: ['/file.ts'],
      activeTab: '/file.ts',
    });
  });

  it('does not duplicate existing tab', () => {
    const initial = makeLeaf('p1', ['/a.ts', '/b.ts'], '/a.ts');
    const { result } = renderHook(() => usePaneLayout(initial));

    act(() => result.current.openFile('p1', '/b.ts'));

    const leaf = result.current.layout as PaneNode & { type: 'leaf' };
    expect(leaf.tabs).toEqual(['/a.ts', '/b.ts']);
    expect(leaf.activeTab).toBe('/b.ts');
  });

  it('splits a leaf pane into two children', () => {
    const initial = makeLeaf('p1', ['/a.ts'], '/a.ts');
    const { result } = renderHook(() => usePaneLayout(initial));

    act(() => result.current.splitPane('p1', 'vertical'));

    const layout = result.current.layout;
    expect(layout.type).toBe('split');
    if (layout.type === 'split') {
      expect(layout.direction).toBe('vertical');
      expect(layout.ratio).toBe(0.5);
      expect(layout.children[0].type).toBe('leaf');
      expect(layout.children[1].type).toBe('leaf');
      const left = layout.children[0] as PaneNode & { type: 'leaf' };
      const right = layout.children[1] as PaneNode & { type: 'leaf' };
      expect(left.tabs).toEqual(['/a.ts']);
      expect(right.tabs).toEqual(['/a.ts']);
      expect(left.id).not.toBe(right.id);
    }
  });

  it('closes a tab and updates activeTab', () => {
    const initial = makeLeaf('p1', ['/a.ts', '/b.ts', '/c.ts'], '/b.ts');
    const { result } = renderHook(() => usePaneLayout(initial));

    act(() => result.current.closeTab('p1', '/b.ts'));

    const leaf = result.current.layout as PaneNode & { type: 'leaf' };
    expect(leaf.tabs).toEqual(['/a.ts', '/c.ts']);
    // Active tab should move to the next available at the same index
    expect(leaf.activeTab).toBe('/c.ts');
  });

  it('closing last tab in a pane leaves empty pane', () => {
    const initial = makeLeaf('p1', ['/a.ts'], '/a.ts');
    const { result } = renderHook(() => usePaneLayout(initial));

    act(() => result.current.closeTab('p1', '/a.ts'));

    const leaf = result.current.layout as PaneNode & { type: 'leaf' };
    expect(leaf.tabs).toEqual([]);
    expect(leaf.activeTab).toBeNull();
  });

  it('selectTab switches active tab', () => {
    const initial = makeLeaf('p1', ['/a.ts', '/b.ts'], '/a.ts');
    const { result } = renderHook(() => usePaneLayout(initial));

    act(() => result.current.selectTab('p1', '/b.ts'));

    const leaf = result.current.layout as PaneNode & { type: 'leaf' };
    expect(leaf.activeTab).toBe('/b.ts');
  });

  it('closePane collapses parent split', () => {
    // Manually build a split layout
    const layout: PaneNode = {
      type: 'split',
      direction: 'vertical',
      children: [makeLeaf('left', ['/a.ts'], '/a.ts'), makeLeaf('right', ['/b.ts'], '/b.ts')],
      ratio: 0.5,
    };
    const { result } = renderHook(() => usePaneLayout(layout));

    act(() => result.current.closePane('right'));

    expect(result.current.layout).toEqual(makeLeaf('left', ['/a.ts'], '/a.ts'));
  });

  it('updateLayout replaces entire layout', () => {
    const initial = makeLeaf('p1');
    const { result } = renderHook(() => usePaneLayout(initial));
    const newLayout = makeLeaf('p2', ['/x.ts'], '/x.ts');

    act(() => result.current.updateLayout(newLayout));

    expect(result.current.layout).toEqual(newLayout);
  });
});

describe('paneReducer (unit)', () => {
  it('open file on non-existent pane is a no-op', () => {
    const state = makeLeaf('p1');
    const result = paneReducer(state, {
      type: 'OPEN_FILE',
      paneId: 'nonexistent',
      path: '/x.ts',
    });
    expect(result).toBe(state);
  });
});

describe('firstLeaf', () => {
  it('returns leaf for a leaf node', () => {
    const leaf = makeLeaf('p1', ['/a.ts'], '/a.ts');
    expect(firstLeaf(leaf)).toBe(leaf);
  });

  it('returns leftmost leaf for a split', () => {
    const left = makeLeaf('left');
    const layout: PaneNode = {
      type: 'split',
      direction: 'vertical',
      children: [left, makeLeaf('right')],
      ratio: 0.5,
    };
    expect(firstLeaf(layout)).toBe(left);
  });
});
