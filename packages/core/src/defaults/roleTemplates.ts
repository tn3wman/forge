import type { AgentRole } from '../types/agent';
import type { CliType } from '../types/agentCli';

export interface RoleTemplate {
  role: AgentRole;
  displayName: string;
  description: string;
  defaultCliType: CliType;
  defaultAllowedTools: string[];
  systemPromptHint: string;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    role: 'builder',
    displayName: 'Builder',
    description: 'Builds features and implements code changes',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Edit', 'Write', 'Bash', 'Read', 'Glob', 'Grep'],
    systemPromptHint:
      'You are building features. Focus on implementation. Follow existing code patterns.',
  },
  {
    role: 'refactorer',
    displayName: 'Refactorer',
    description: 'Improves code structure without changing behavior',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Edit', 'Read', 'Glob', 'Grep', 'Bash'],
    systemPromptHint:
      'You are refactoring code. Preserve behavior while improving structure. Run tests after changes.',
  },
  {
    role: 'debugger',
    displayName: 'Debugger',
    description: 'Investigates and fixes bugs',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Read', 'Bash', 'Edit', 'Grep', 'Glob'],
    systemPromptHint:
      'You are debugging an issue. Investigate methodically. Check logs, reproduce the issue, then fix.',
  },
  {
    role: 'tester',
    displayName: 'Tester',
    description: 'Writes and runs tests',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Read', 'Write', 'Bash', 'Glob', 'Grep'],
    systemPromptHint: 'You are writing and running tests. Focus on test coverage and edge cases.',
  },
  {
    role: 'reviewer',
    displayName: 'Reviewer',
    description: 'Reviews code for quality and correctness',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Read', 'Grep', 'Glob'],
    systemPromptHint:
      'You are reviewing code. Do not make edits. Identify bugs, security issues, and improvements.',
  },
  {
    role: 'researcher',
    displayName: 'Researcher',
    description: 'Researches codebases and documentation',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Read', 'Grep', 'Glob'],
    systemPromptHint:
      'You are researching. Gather information and summarize findings. Do not edit code.',
  },
  {
    role: 'release_manager',
    displayName: 'Release Manager',
    description: 'Manages builds, releases, and deployments',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Read', 'Bash', 'Edit', 'Glob'],
    systemPromptHint:
      'You are managing a release. Handle version bumps, changelogs, and deployment steps.',
  },
  {
    role: 'docs_writer',
    displayName: 'Docs Writer',
    description: 'Writes and updates documentation',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Read', 'Write', 'Edit', 'Glob'],
    systemPromptHint: 'You are writing documentation. Keep it clear, concise, and accurate.',
  },
  {
    role: 'browser_operator',
    displayName: 'Browser Operator',
    description: 'Automates browser interactions',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Read', 'Bash'],
    systemPromptHint: 'You are operating a browser. Navigate pages and interact with UI elements.',
  },
  {
    role: 'data_migrator',
    displayName: 'Data Migrator',
    description: 'Handles database schema changes and data migrations',
    defaultCliType: 'claude_code',
    defaultAllowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob'],
    systemPromptHint:
      'You are handling data migrations. Be careful with destructive operations. Always backup first.',
  },
];

export function getRoleTemplate(role: AgentRole): RoleTemplate | undefined {
  return ROLE_TEMPLATES.find((t) => t.role === role);
}
