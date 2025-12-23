"use client";

import { useState, useCallback, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsModal } from "./keyboard-shortcuts-modal";
import { Confetti, useFirstApprovalCelebration } from "./confetti";
import { ExportButton } from "./export-button";

interface Post {
  id: string;
  hook: string;
  bodyBeats: string[];
  openQuestion: string;
  postType: string;
  fullText: string;
  approved: boolean | null;
}

interface ResultsClientWrapperProps {
  children: React.ReactNode;
  posts: Post[];
  runLabel: string;
}

export function ResultsClientWrapper({
  children,
  posts,
  runLabel,
}: ResultsClientWrapperProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { showConfetti, triggerCelebration, onConfettiComplete } =
    useFirstApprovalCelebration();

  const handleNavigateUp = useCallback(() => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNavigateDown = useCallback(() => {
    setSelectedIndex((prev) => Math.min(posts.length - 1, prev + 1));
  }, [posts.length]);

  const handleApprove = useCallback(() => {
    // This triggers the approve action for the currently selected post
    const selectedPost = posts[selectedIndex];
    if (selectedPost && !selectedPost.approved) {
      // Dispatch a custom event that the PostCard can listen to
      window.dispatchEvent(
        new CustomEvent("keyboard-approve", {
          detail: { postId: selectedPost.id },
        })
      );
      triggerCelebration();
    }
  }, [selectedIndex, posts, triggerCelebration]);

  const handleCopy = useCallback(() => {
    const selectedPost = posts[selectedIndex];
    if (selectedPost) {
      navigator.clipboard.writeText(selectedPost.fullText);
      // Dispatch event for toast notification
      window.dispatchEvent(
        new CustomEvent("keyboard-copy", {
          detail: { postId: selectedPost.id },
        })
      );
    }
  }, [selectedIndex, posts]);

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onNavigateUp: handleNavigateUp,
    onNavigateDown: handleNavigateDown,
    onApprove: handleApprove,
    onCopy: handleCopy,
    enabled: true,
  });

  // Scroll selected post into view
  useEffect(() => {
    const selectedPost = posts[selectedIndex];
    if (selectedPost) {
      const element = document.getElementById(`post-${selectedPost.id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedIndex, posts]);

  return (
    <>
      {/* Confetti celebration */}
      <Confetti trigger={showConfetti} onComplete={onConfettiComplete} />

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Floating toolbar */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Export button */}
        <ExportButton posts={posts} runLabel={runLabel} approvedOnly />

        {/* Keyboard shortcut hint */}
        <button
          onClick={() => setShowHelp(true)}
          className="p-3 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg shadow-lg transition-colors"
          title="Keyboard shortcuts"
        >
          <kbd className="text-sm font-mono text-neutral-300">?</kbd>
        </button>
      </div>

      {/* Pass selected state to children via CSS classes */}
      <div data-selected-index={selectedIndex}>{children}</div>
    </>
  );
}
