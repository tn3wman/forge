import { useEffect, useCallback } from 'react';

interface UseHotkeysOptions {
  itemCount: number;
  onSelect: (index: number) => void;
  enabled?: boolean;
}

export function useHotkeys({ itemCount, onSelect, enabled = true }: UseHotkeysOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (!e.metaKey && !e.ctrlKey) return;

      const digit = parseInt(e.key, 10);
      if (isNaN(digit) || digit < 1 || digit > 9) return;

      const index = digit - 1;
      if (index >= itemCount) return;

      e.preventDefault();
      onSelect(index);
    },
    [enabled, itemCount, onSelect],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
