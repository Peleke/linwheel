"use client";

import { useCallback, useRef, RefObject } from "react";
import { toggleFormatOnSelection } from "@/lib/unicode-format";

interface FormattingToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export function FormattingToolbar({ textareaRef, value, onChange }: FormattingToolbarProps) {
  const applyFormat = useCallback(
    (format: "bold" | "italic" | "bold-italic") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;

      if (selectionStart === selectionEnd) {
        // No selection - show a hint or do nothing
        return;
      }

      const result = toggleFormatOnSelection(value, selectionStart, selectionEnd, format);
      onChange(result.text);

      // Restore selection after React re-renders
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
      });
    },
    [textareaRef, value, onChange]
  );

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
      <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-2 select-none">Format:</span>

      <button
        type="button"
        onClick={() => applyFormat("bold")}
        className="px-2 py-1 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
        title="Bold (select text first)"
      >
        B
      </button>

      <button
        type="button"
        onClick={() => applyFormat("italic")}
        className="px-2 py-1 text-sm italic text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
        title="Italic (select text first)"
      >
        I
      </button>

      <button
        type="button"
        onClick={() => applyFormat("bold-italic")}
        className="px-2 py-1 text-sm font-bold italic text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
        title="Bold Italic (select text first)"
      >
        BI
      </button>

      <div className="ml-auto text-xs text-zinc-400 dark:text-zinc-500 select-none">
        Select text to format
      </div>
    </div>
  );
}

// Compact toolbar for use within form fields (smaller, inline)
interface CompactFormattingToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
}

export function CompactFormattingToolbar({ textareaRef, value, onChange }: CompactFormattingToolbarProps) {
  const applyFormat = useCallback(
    (format: "bold" | "italic" | "bold-italic") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { selectionStart, selectionEnd } = textarea;

      if (selectionStart === selectionEnd) {
        return;
      }

      const result = toggleFormatOnSelection(value, selectionStart, selectionEnd, format);
      onChange(result.text);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(result.newSelectionStart, result.newSelectionEnd);
      });
    },
    [textareaRef, value, onChange]
  );

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => applyFormat("bold")}
        className="p-1 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => applyFormat("italic")}
        className="p-1 text-xs italic text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => applyFormat("bold-italic")}
        className="p-1 text-xs font-bold italic text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
        title="Bold Italic"
      >
        BI
      </button>
    </div>
  );
}

// Self-contained textarea with formatting toolbar
interface FormattedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  labelClassName?: string;
  // Optional custom header - replaces default label row
  header?: React.ReactNode;
  // Optional extra content to render in the header row (between label and toolbar)
  headerExtra?: React.ReactNode;
}

export function FormattedTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className = "",
  label,
  labelClassName = "",
  header,
  headerExtra,
}: FormattedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toolbar = (
    <CompactFormattingToolbar
      textareaRef={textareaRef}
      value={value}
      onChange={onChange}
    />
  );

  return (
    <div>
      {header ? (
        <div className="flex items-center justify-between mb-2">
          {header}
          {toolbar}
        </div>
      ) : label ? (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium text-zinc-700 dark:text-zinc-300 ${labelClassName}`}>
              {label}
            </label>
            {headerExtra}
          </div>
          {toolbar}
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-4 py-3 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${className}`}
      />
    </div>
  );
}
