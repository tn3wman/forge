import { useCallback, useRef, type ReactNode } from 'react';
import styles from './BayLayout.module.css';

interface BayLayoutProps {
  leftRailWidth: number;
  rightRailWidth: number;
  onLeftRailResize: (width: number) => void;
  onRightRailResize: (width: number) => void;
  onResizeEnd: () => void;
  leftRail: ReactNode;
  center: ReactNode;
  rightRail: ReactNode;
}

const MIN_RAIL_WIDTH = 180;
const MAX_RAIL_FRACTION = 0.35;

export function BayLayout({
  leftRailWidth,
  rightRailWidth,
  onLeftRailResize,
  onRightRailResize,
  onResizeEnd,
  leftRail,
  center,
  rightRail,
}: BayLayoutProps) {
  const layoutRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback(
    (side: 'left' | 'right', e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = side === 'left' ? leftRailWidth : rightRailWidth;
      const layoutWidth = layoutRef.current?.offsetWidth ?? window.innerWidth;
      const maxWidth = layoutWidth * MAX_RAIL_FRACTION;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = side === 'left' ? moveEvent.clientX - startX : startX - moveEvent.clientX;
        const newWidth = Math.min(maxWidth, Math.max(MIN_RAIL_WIDTH, startWidth + delta));
        if (side === 'left') onLeftRailResize(newWidth);
        else onRightRailResize(newWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.classList.remove(styles.resizing);
        onResizeEnd();
      };

      document.body.classList.add(styles.resizing);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [leftRailWidth, rightRailWidth, onLeftRailResize, onRightRailResize, onResizeEnd],
  );

  return (
    <div
      ref={layoutRef}
      className={styles.layout}
      style={{ gridTemplateColumns: `${leftRailWidth}px 4px 1fr 4px ${rightRailWidth}px` }}
    >
      <div className={styles.leftRail} data-testid="left-rail">
        {leftRail}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        className={styles.resizeHandle}
        onMouseDown={(e) => startResize('left', e)}
      />
      <div className={styles.center} data-testid="center-panel">
        {center}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        className={styles.resizeHandle}
        onMouseDown={(e) => startResize('right', e)}
      />
      <div className={styles.rightRail} data-testid="right-rail">
        {rightRail}
      </div>
    </div>
  );
}
