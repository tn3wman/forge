import { terminalTabsReducer } from '../useTerminalTabs';
import type { TerminalTab } from '@forge/core';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(() => {})) }));

function makeTab(id: string, label = 'Terminal'): TerminalTab {
  return { id, label, isExited: false, exitCode: null };
}

describe('terminalTabsReducer', () => {
  const empty = { tabs: [] as TerminalTab[], activeTabId: null };

  it('ADD_TAB adds a tab and makes it active', () => {
    const tab = makeTab('t1');
    const result = terminalTabsReducer(empty, { type: 'ADD_TAB', tab });
    expect(result.tabs).toEqual([tab]);
    expect(result.activeTabId).toBe('t1');
  });

  it('ADD_TAB appends to existing tabs', () => {
    const state = { tabs: [makeTab('t1')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, { type: 'ADD_TAB', tab: makeTab('t2') });
    expect(result.tabs).toHaveLength(2);
    expect(result.activeTabId).toBe('t2');
  });

  it('REMOVE_TAB removes tab and selects next', () => {
    const state = { tabs: [makeTab('t1'), makeTab('t2'), makeTab('t3')], activeTabId: 't2' };
    const result = terminalTabsReducer(state, { type: 'REMOVE_TAB', tabId: 't2' });
    expect(result.tabs).toHaveLength(2);
    expect(result.activeTabId).toBe('t3');
  });

  it('REMOVE_TAB selects previous when removing last', () => {
    const state = { tabs: [makeTab('t1'), makeTab('t2')], activeTabId: 't2' };
    const result = terminalTabsReducer(state, { type: 'REMOVE_TAB', tabId: 't2' });
    expect(result.tabs).toHaveLength(1);
    expect(result.activeTabId).toBe('t1');
  });

  it('REMOVE_TAB last tab leaves empty', () => {
    const state = { tabs: [makeTab('t1')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, { type: 'REMOVE_TAB', tabId: 't1' });
    expect(result.tabs).toHaveLength(0);
    expect(result.activeTabId).toBeNull();
  });

  it('SELECT_TAB changes active', () => {
    const state = { tabs: [makeTab('t1'), makeTab('t2')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, { type: 'SELECT_TAB', tabId: 't2' });
    expect(result.activeTabId).toBe('t2');
  });

  it('RENAME_TAB updates label', () => {
    const state = { tabs: [makeTab('t1', 'Old')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, { type: 'RENAME_TAB', tabId: 't1', label: 'New' });
    expect(result.tabs[0].label).toBe('New');
  });

  it('MARK_EXITED sets exit state', () => {
    const state = { tabs: [makeTab('t1')], activeTabId: 't1' };
    const result = terminalTabsReducer(state, { type: 'MARK_EXITED', tabId: 't1', exitCode: 0 });
    expect(result.tabs[0].isExited).toBe(true);
    expect(result.tabs[0].exitCode).toBe(0);
  });
});
