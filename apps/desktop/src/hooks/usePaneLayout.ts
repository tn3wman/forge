import { useReducer, useCallback } from 'react';
import type { PaneNode } from '@forge/core';

// --- Actions ---

type PaneAction =
  | { type: 'OPEN_FILE'; paneId: string; path: string }
  | { type: 'SELECT_TAB'; paneId: string; path: string }
  | { type: 'CLOSE_TAB'; paneId: string; path: string }
  | { type: 'SPLIT_PANE'; paneId: string; direction: 'horizontal' | 'vertical' }
  | { type: 'CLOSE_PANE'; paneId: string }
  | { type: 'UPDATE_LAYOUT'; layout: PaneNode }
  | { type: 'UPDATE_RATIO'; path: string[]; ratio: number };

// --- Helpers ---

/** Walk tree, replacing the node matched by predicate with the result of `fn`. */
function mapTree(
  node: PaneNode,
  id: string,
  fn: (leaf: PaneNode & { type: 'leaf' }) => PaneNode,
): PaneNode {
  if (node.type === 'leaf') {
    return node.id === id ? fn(node) : node;
  }
  const left = mapTree(node.children[0], id, fn);
  const right = mapTree(node.children[1], id, fn);
  if (left === node.children[0] && right === node.children[1]) return node;
  return { ...node, children: [left, right] };
}

/**
 * Remove a leaf by id and collapse the parent split,
 * returning the sibling in its place.
 */
function removeLeaf(node: PaneNode, id: string): PaneNode | null {
  if (node.type === 'leaf') {
    return node.id === id ? null : node;
  }
  const [left, right] = node.children;
  if (left.type === 'leaf' && left.id === id) return right;
  if (right.type === 'leaf' && right.id === id) return left;

  const newLeft = removeLeaf(left, id);
  if (newLeft === null) return right;
  if (newLeft !== left) return { ...node, children: [newLeft, right] };

  const newRight = removeLeaf(right, id);
  if (newRight === null) return left;
  if (newRight !== right) return { ...node, children: [left, newRight] };

  return node;
}

/** Find the first leaf in depth-first order. */
export function firstLeaf(node: PaneNode): PaneNode & { type: 'leaf' } {
  if (node.type === 'leaf') return node;
  return firstLeaf(node.children[0]);
}

// --- Reducer ---

export function paneReducer(state: PaneNode, action: PaneAction): PaneNode {
  switch (action.type) {
    case 'OPEN_FILE': {
      return mapTree(state, action.paneId, (leaf) => {
        if (leaf.tabs.includes(action.path)) {
          return { ...leaf, activeTab: action.path };
        }
        return {
          ...leaf,
          tabs: [...leaf.tabs, action.path],
          activeTab: action.path,
        };
      });
    }

    case 'SELECT_TAB': {
      return mapTree(state, action.paneId, (leaf) => ({
        ...leaf,
        activeTab: action.path,
      }));
    }

    case 'CLOSE_TAB': {
      return mapTree(state, action.paneId, (leaf) => {
        const next = leaf.tabs.filter((t) => t !== action.path);
        let nextActive = leaf.activeTab;
        if (leaf.activeTab === action.path) {
          const idx = leaf.tabs.indexOf(action.path);
          nextActive = next[Math.min(idx, next.length - 1)] ?? null;
        }
        return { ...leaf, tabs: next, activeTab: nextActive };
      });
    }

    case 'SPLIT_PANE': {
      return mapTree(state, action.paneId, (leaf) => ({
        type: 'split' as const,
        direction: action.direction,
        children: [
          { ...leaf, id: crypto.randomUUID() },
          {
            type: 'leaf' as const,
            id: crypto.randomUUID(),
            tabs: [...leaf.tabs],
            activeTab: leaf.activeTab,
          },
        ],
        ratio: 0.5,
      }));
    }

    case 'CLOSE_PANE': {
      const result = removeLeaf(state, action.paneId);
      // If removing would leave nothing, keep the empty leaf
      if (result === null) return state;
      return result;
    }

    case 'UPDATE_LAYOUT': {
      return action.layout;
    }

    case 'UPDATE_RATIO': {
      // path is an array of indices leading to the split node
      // For simplicity, we won't implement deep path-based ratio update here
      // Instead, we'll update the first split found at top level
      if (state.type === 'split') {
        return { ...state, ratio: action.ratio };
      }
      return state;
    }

    default:
      return state;
  }
}

// --- Hook ---

export function createDefaultLayout(): PaneNode {
  return { type: 'leaf', id: crypto.randomUUID(), tabs: [], activeTab: null };
}

export function usePaneLayout(initialLayout: PaneNode) {
  const [layout, dispatch] = useReducer(paneReducer, initialLayout);

  const openFile = useCallback(
    (paneId: string, path: string) => dispatch({ type: 'OPEN_FILE', paneId, path }),
    [],
  );

  const selectTab = useCallback(
    (paneId: string, path: string) => dispatch({ type: 'SELECT_TAB', paneId, path }),
    [],
  );

  const closeTab = useCallback(
    (paneId: string, path: string) => dispatch({ type: 'CLOSE_TAB', paneId, path }),
    [],
  );

  const splitPane = useCallback(
    (paneId: string, direction: 'horizontal' | 'vertical') =>
      dispatch({ type: 'SPLIT_PANE', paneId, direction }),
    [],
  );

  const closePane = useCallback((paneId: string) => dispatch({ type: 'CLOSE_PANE', paneId }), []);

  const updateLayout = useCallback(
    (newLayout: PaneNode) => dispatch({ type: 'UPDATE_LAYOUT', layout: newLayout }),
    [],
  );

  return {
    layout,
    openFile,
    selectTab,
    closeTab,
    splitPane,
    closePane,
    updateLayout,
    dispatch,
  };
}
