import { useEffect, useState } from "react";

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;
const MONTH = 2592000;
const YEAR = 31536000;

export function formatTimeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 0) return "just now";
  if (seconds < MINUTE) return "just now";
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return `${m}m ago`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return `${h}h ago`;
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return `${d}d ago`;
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return `${w}w ago`;
  }
  if (seconds < YEAR) {
    const mo = Math.floor(seconds / MONTH);
    return `${mo}mo ago`;
  }
  const y = Math.floor(seconds / YEAR);
  return `${y}y ago`;
}

export function TimeAgo({ date }: { date: string }) {
  const [text, setText] = useState(() => formatTimeAgo(date));

  useEffect(() => {
    setText(formatTimeAgo(date));
    const interval = setInterval(() => {
      setText(formatTimeAgo(date));
    }, 60_000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <time
      dateTime={date}
      title={new Date(date).toLocaleString()}
      className="text-xs text-muted-foreground tabular-nums"
    >
      {text}
    </time>
  );
}
