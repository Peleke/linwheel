"use client";

import { useEffect, useCallback, useState } from "react";

interface KeyboardShortcutsOptions {
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onApprove?: () => void;
  onCopy?: () => void;
  onHelp?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onNavigateUp,
  onNavigateDown,
  onApprove,
  onCopy,
  onHelp,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Don't trigger with modifier keys (except for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "k":
        case "arrowup":
          e.preventDefault();
          onNavigateUp?.();
          break;
        case "j":
        case "arrowdown":
          e.preventDefault();
          onNavigateDown?.();
          break;
        case "a":
          e.preventDefault();
          onApprove?.();
          break;
        case "c":
          e.preventDefault();
          onCopy?.();
          break;
        case "?":
          e.preventDefault();
          setShowHelp((prev) => !prev);
          onHelp?.();
          break;
        case "escape":
          setShowHelp(false);
          break;
      }
    },
    [onNavigateUp, onNavigateDown, onApprove, onCopy, onHelp]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  return { showHelp, setShowHelp };
}

// Keyboard shortcuts data for display
export const KEYBOARD_SHORTCUTS = [
  { key: "j / ↓", description: "Next post" },
  { key: "k / ↑", description: "Previous post" },
  { key: "a", description: "Approve current post" },
  { key: "c", description: "Copy to clipboard" },
  { key: "?", description: "Toggle shortcuts help" },
  { key: "Esc", description: "Close dialogs" },
];
