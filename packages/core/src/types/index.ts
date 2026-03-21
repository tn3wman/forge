export * from './bay';
export * from './lane';
export * from './task';
export * from './agent';
export * from './event';

export function createId(): string {
  return crypto.randomUUID();
}
