"use client";

import { KEYBOARD_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between">
              <span className="text-neutral-300">{shortcut.description}</span>
              <kbd className="px-2 py-1 bg-neutral-800 border border-neutral-600 rounded text-sm font-mono text-neutral-200">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-4 pt-4 border-t border-neutral-700 text-xs text-neutral-500 text-center">
          Press <kbd className="px-1 bg-neutral-800 rounded">?</kbd> to toggle this menu
        </p>
      </div>
    </div>
  );
}
