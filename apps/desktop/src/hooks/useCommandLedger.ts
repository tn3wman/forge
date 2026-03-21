import { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { commandLedgerIpc } from '../ipc/commandLedger';
import type { CommandEntry, CommandFilters } from '@forge/core';

export function useCommandLedger(bayId: string, initialFilters?: CommandFilters) {
  const [commands, setCommands] = useState<CommandEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<CommandFilters>(initialFilters ?? {});
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchCommands = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await commandLedgerIpc.query(bayId, filters);
      setCommands(result);
    } catch (err) {
      console.error('Failed to query commands:', err);
    } finally {
      setIsLoading(false);
    }
  }, [bayId, filters]);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  useEffect(() => {
    const unlisten = listen<string>('command-ledger:updated', (event) => {
      if (event.payload === bayId) {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(fetchCommands, 200);
      }
    });
    return () => {
      clearTimeout(debounceRef.current);
      unlisten.then((fn) => fn());
    };
  }, [bayId, fetchCommands]);

  return { commands, isLoading, refresh: fetchCommands, filters, setFilters };
}
