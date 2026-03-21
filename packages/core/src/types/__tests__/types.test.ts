import { describe, it, expect } from 'vitest';
import {
  isBayStatus,
  isLaneStatus,
  isTaskType,
  isTaskStatus,
  isAgentRole,
  isApprovalMode,
  isEventType,
  createId,
} from '../index';

describe('type guards', () => {
  describe('isBayStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isBayStatus('active')).toBe(true);
      expect(isBayStatus('inactive')).toBe(true);
      expect(isBayStatus('loading')).toBe(true);
      expect(isBayStatus('error')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isBayStatus('unknown')).toBe(false);
      expect(isBayStatus('')).toBe(false);
    });
  });

  describe('isLaneStatus', () => {
    it('returns true for valid statuses', () => {
      expect(isLaneStatus('idle')).toBe(true);
      expect(isLaneStatus('running')).toBe(true);
      expect(isLaneStatus('awaiting_approval')).toBe(true);
      expect(isLaneStatus('completed')).toBe(true);
    });

    it('returns false for invalid statuses', () => {
      expect(isLaneStatus('unknown')).toBe(false);
    });
  });

  describe('isTaskType', () => {
    it('returns true for valid types', () => {
      expect(isTaskType('shell_command')).toBe(true);
      expect(isTaskType('file_edit')).toBe(true);
      expect(isTaskType('agent_prompt')).toBe(true);
    });

    it('returns false for invalid types', () => {
      expect(isTaskType('invalid')).toBe(false);
    });
  });

  describe('isAgentRole', () => {
    it('returns true for valid roles', () => {
      expect(isAgentRole('builder')).toBe(true);
      expect(isAgentRole('tester')).toBe(true);
      expect(isAgentRole('browser_operator')).toBe(true);
    });

    it('returns false for invalid roles', () => {
      expect(isAgentRole('hacker')).toBe(false);
    });
  });

  describe('createId', () => {
    it('returns a string', () => {
      expect(typeof createId()).toBe('string');
    });

    it('returns unique ids', () => {
      const id1 = createId();
      const id2 = createId();
      expect(id1).not.toBe(id2);
    });
  });
});
