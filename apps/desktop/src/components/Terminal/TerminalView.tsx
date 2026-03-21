import { useRef } from 'react';
import { useTerminal } from '../../hooks/useTerminal';
import '@xterm/xterm/css/xterm.css';
import styles from './TerminalView.module.css';

interface Props {
  terminalId: string;
  isVisible: boolean;
}

export function TerminalView({ terminalId, isVisible }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  useTerminal(terminalId, containerRef);
  return (
    <div
      ref={containerRef}
      className={styles.terminalView}
      style={{ display: isVisible ? 'block' : 'none' }}
    />
  );
}
