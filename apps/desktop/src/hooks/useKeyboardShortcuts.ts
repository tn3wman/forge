import { useEffect, useRef } from "react";
import { isEditableTarget } from "../lib/keyboard";

export interface Shortcut {
  label: string;
  keys: string;
  action: () => void;
  mode: "sequence" | "combo";
  sequenceKey?: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  key?: string;
  category?: string;
  enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    let gPressed = false;
    let timeout: ReturnType<typeof setTimeout>;

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e)) return;

      // Handle combo shortcuts (e.g. Escape, Cmd+K)
      for (const s of shortcutsRef.current) {
        if (s.mode !== "combo" || s.enabled === false) continue;
        if (s.key === "Escape" && e.key === "Escape") {
          s.action();
          return;
        }
        const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : true;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        if (metaMatch && shiftMatch && e.key === s.key && s.key !== "Escape") {
          e.preventDefault();
          s.action();
          return;
        }
      }

      // Sequence mode: G + key
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        gPressed = true;
        clearTimeout(timeout);
        timeout = setTimeout(() => { gPressed = false; }, 500);
        return;
      }

      if (gPressed) {
        gPressed = false;
        for (const s of shortcutsRef.current) {
          if (s.mode === "sequence" && s.sequenceKey === e.key && s.enabled !== false) {
            e.preventDefault();
            s.action();
            return;
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeout);
    };
  }, []);
}
