import { describe, it, expect } from 'vitest';
import { parseWindowState, serializeWindowState, DEFAULT_WINDOW_STATE } from '../windowState';

describe('parseWindowState', () => {
  it('returns defaults for null', () => {
    expect(parseWindowState(null)).toEqual(DEFAULT_WINDOW_STATE);
  });

  it('returns defaults for invalid JSON', () => {
    expect(parseWindowState('not json')).toEqual(DEFAULT_WINDOW_STATE);
  });

  it('parses valid JSON', () => {
    const state = { ...DEFAULT_WINDOW_STATE, leftRailWidth: 300 };
    expect(parseWindowState(JSON.stringify(state))).toEqual(state);
  });

  it('merges partial JSON with defaults', () => {
    const result = parseWindowState(JSON.stringify({ leftRailWidth: 300 }));
    expect(result.leftRailWidth).toBe(300);
    expect(result.rightRailWidth).toBe(DEFAULT_WINDOW_STATE.rightRailWidth);
  });
});

describe('serializeWindowState', () => {
  it('returns JSON string', () => {
    const json = serializeWindowState(DEFAULT_WINDOW_STATE);
    expect(JSON.parse(json)).toEqual(DEFAULT_WINDOW_STATE);
  });
});
