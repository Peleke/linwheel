"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CopyButtonProps {
  text: string;
  variant?: "default" | "compact";
}

export function CopyButton({ text, variant = "default" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const baseStyles = variant === "compact"
    ? "px-2 py-1 text-xs font-medium rounded"
    : "p-2 rounded-lg";

  return (
    <motion.button
      onClick={handleCopy}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1`}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.svg
            key="check"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={variant === "compact" ? "w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" : "w-4 h-4 text-emerald-600 dark:text-emerald-400"}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        ) : (
          <motion.svg
            key="copy"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={variant === "compact" ? "w-3.5 h-3.5" : "w-4 h-4"}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </motion.svg>
        )}
      </AnimatePresence>
      {variant === "compact" && (copied ? "Copied" : "Copy")}
    </motion.button>
  );
}
