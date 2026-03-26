import { useRef, useEffect } from "react";
import type { GraphRow } from "@forge/shared";

const LANE_WIDTH = 20;
const NODE_RADIUS = 4;
const COLOR_PALETTE = [
  "#4ec9b0",
  "#569cd6",
  "#c586c0",
  "#ce9178",
  "#dcdcaa",
  "#9cdcfe",
  "#d16969",
  "#608b4e",
];

interface CommitGraphCanvasProps {
  rows: GraphRow[];
  rowHeight: number;
  scrollTop: number;
  width: number;
}

export function CommitGraphCanvas({
  rows,
  rowHeight,
  scrollTop,
  width,
}: CommitGraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const firstVisible = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
    const lastVisible = Math.min(
      rows.length - 1,
      Math.ceil((scrollTop + height) / rowHeight) + 1,
    );

    function laneX(col: number): number {
      return col * LANE_WIDTH + LANE_WIDTH / 2;
    }

    function rowCenterY(index: number): number {
      return index * rowHeight + rowHeight / 2 - scrollTop;
    }

    // Draw lines first (behind nodes)
    for (let i = firstVisible; i <= lastVisible; i++) {
      const row = rows[i];
      const cy = rowCenterY(i);

      for (const line of row.lines) {
        const color = COLOR_PALETTE[line.colorIndex % COLOR_PALETTE.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        const fromX = laneX(line.fromColumn);
        const toX = laneX(line.toColumn);
        const topY = cy - rowHeight / 2;
        const bottomY = cy + rowHeight / 2;

        if (line.fromColumn === line.toColumn) {
          // Straight vertical line
          ctx.moveTo(fromX, topY);
          ctx.lineTo(toX, bottomY);
        } else {
          // Quadratic bezier curve between columns
          ctx.moveTo(fromX, topY);
          ctx.quadraticCurveTo(fromX, cy, toX, bottomY);
        }

        ctx.stroke();
      }
    }

    // Draw commit nodes on top
    for (let i = firstVisible; i <= lastVisible; i++) {
      const row = rows[i];
      const cx = laneX(row.column);
      const cy = rowCenterY(i);
      const color = COLOR_PALETTE[row.column % COLOR_PALETTE.length];

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Inner dot for merge commits
      if (row.commit.parents.length > 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, NODE_RADIUS - 2, 0, Math.PI * 2);
        ctx.fillStyle = "#1e1e1e";
        ctx.fill();
      }
    }
  }, [rows, rowHeight, scrollTop, width]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: "100%" }}
      className="pointer-events-none"
    />
  );
}
