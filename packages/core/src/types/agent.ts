import type { FileScope } from './lane';

export interface AgentConfig {
  id: string;
  role: AgentRole;
  name: string;
  modelId: string;
  permissions: AgentPermissions;
  systemPrompt: string | null;
  createdAt: string;
}

export const AGENT_ROLES = [
  'builder',
  'refactorer',
  'debugger',
  'tester',
  'reviewer',
  'researcher',
  'release_manager',
  'docs_writer',
  'browser_operator',
  'data_migrator',
] as const;
export type AgentRole = (typeof AGENT_ROLES)[number];

export function isAgentRole(value: string): value is AgentRole {
  return (AGENT_ROLES as readonly string[]).includes(value);
}

export interface AgentPermissions {
  fileScopes: FileScope;
  commandScopes: CommandScope;
  networkScopes: NetworkScope;
  browserScopes: BrowserScope;
  approvalMode: ApprovalMode;
}

export const APPROVAL_MODES = ['manual', 'balanced', 'trusted'] as const;
export type ApprovalMode = (typeof APPROVAL_MODES)[number];

export function isApprovalMode(value: string): value is ApprovalMode {
  return (APPROVAL_MODES as readonly string[]).includes(value);
}

export interface CommandScope {
  allowedCommands: string[];
  blockedCommands: string[];
  requireApproval: string[];
}

export interface NetworkScope {
  allowedHosts: string[];
  blockedHosts: string[];
}

export interface BrowserScope {
  allowedUrls: string[];
  maxSessions: number;
}
