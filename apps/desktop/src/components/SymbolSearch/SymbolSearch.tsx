import { useState, useRef, useEffect, useCallback } from 'react';
import type { LspSymbol } from '@forge/core';
import styles from './SymbolSearch.module.css';

interface SymbolSearchProps {
  mode: 'file' | 'workspace';
  results: LspSymbol[];
  onQueryChange: (query: string) => void;
  onSelect: (symbol: LspSymbol) => void;
  onClose: () => void;
}

const SYMBOL_KIND_LABELS: Record<number, string> = {
  1: 'File',
  2: 'Module',
  3: 'Namespace',
  4: 'Package',
  5: 'Class',
  6: 'Method',
  7: 'Property',
  8: 'Field',
  9: 'Constructor',
  10: 'Enum',
  11: 'Interface',
  12: 'Function',
  13: 'Variable',
  14: 'Constant',
  15: 'String',
  16: 'Number',
  17: 'Boolean',
  18: 'Array',
  19: 'Object',
  20: 'Key',
  21: 'Null',
  22: 'EnumMember',
  23: 'Struct',
  24: 'Event',
  25: 'Operator',
  26: 'TypeParameter',
};

export function SymbolSearch({
  mode,
  results,
  onQueryChange,
  onSelect,
  onClose,
}: SymbolSearchProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === 'Enter' && results.length > 0 && selectedIndex >= 0) {
        onSelect(results[selectedIndex]);
      }
    },
    [results, selectedIndex, onSelect, onClose],
  );

  const placeholder = mode === 'file' ? 'Go to Symbol in File...' : 'Go to Symbol in Workspace...';

  return (
    <div className={styles.overlay}>
      <div className={styles.palette}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          placeholder={placeholder}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.results}>
          {results.map((symbol, i) => (
            <div
              key={`${symbol.name}-${i}`}
              className={`${styles.result} ${i === selectedIndex ? styles.selected : ''}`}
              onClick={() => onSelect(symbol)}
            >
              <span className={styles.symbolKind}>
                {SYMBOL_KIND_LABELS[symbol.kind] ?? 'Symbol'}
              </span>
              <span className={styles.symbolName}>{symbol.name}</span>
              {symbol.containerName && (
                <span className={styles.containerName}>{symbol.containerName}</span>
              )}
            </div>
          ))}
          {results.length === 0 && <div className={styles.noResults}>No symbols found</div>}
        </div>
      </div>
    </div>
  );
}
