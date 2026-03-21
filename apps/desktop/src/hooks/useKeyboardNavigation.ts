import { useState, useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onActivate: (index: number) => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  itemCount,
  onActivate,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || itemCount === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % itemCount);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + itemCount) % itemCount);
          break;
        case 'Enter':
          e.preventDefault();
          onActivate(selectedIndex);
          break;
      }
    },
    [enabled, itemCount, onActivate, selectedIndex],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (selectedIndex >= itemCount && itemCount > 0) {
      setSelectedIndex(itemCount - 1);
    }
  }, [itemCount, selectedIndex]);

  return { selectedIndex, setSelectedIndex };
}
