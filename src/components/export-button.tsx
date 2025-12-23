"use client";

import { useState } from "react";

interface Post {
  id: string;
  hook: string;
  bodyBeats: string[];
  openQuestion: string;
  postType: string;
  fullText: string;
  approved: boolean | null;
}

interface ExportButtonProps {
  posts: Post[];
  runLabel: string;
  approvedOnly?: boolean;
}

export function ExportButton({ posts, runLabel, approvedOnly = true }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const filteredPosts = approvedOnly ? posts.filter((p) => p.approved) : posts;

  const exportAsJSON = () => {
    const data = filteredPosts.map((post) => ({
      id: post.id,
      type: post.postType,
      hook: post.hook,
      bodyBeats: post.bodyBeats,
      openQuestion: post.openQuestion,
      fullText: post.fullText,
      approved: post.approved,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    downloadBlob(blob, `linwheel-${sanitizeFilename(runLabel)}.json`);
    setIsOpen(false);
  };

  const exportAsCSV = () => {
    const headers = ["ID", "Type", "Hook", "Full Text", "Approved"];
    const rows = filteredPosts.map((post) => [
      post.id,
      post.postType,
      escapeCSV(post.hook),
      escapeCSV(post.fullText),
      post.approved ? "Yes" : "No",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    downloadBlob(blob, `linwheel-${sanitizeFilename(runLabel)}.csv`);
    setIsOpen(false);
  };

  const exportAsMarkdown = () => {
    const md = filteredPosts
      .map(
        (post) =>
          `## ${post.postType.replace("_", " ").toUpperCase()}\n\n${post.fullText}\n\n---\n`
      )
      .join("\n");

    const blob = new Blob([md], { type: "text/markdown" });
    downloadBlob(blob, `linwheel-${sanitizeFilename(runLabel)}.md`);
    setIsOpen(false);
  };

  if (filteredPosts.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Export ({filteredPosts.length})
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <button
              onClick={exportAsJSON}
              className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-700 flex items-center gap-2 transition-colors"
            >
              <span className="text-neutral-400">{"{ }"}</span>
              Export as JSON
            </button>
            <button
              onClick={exportAsCSV}
              className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-700 flex items-center gap-2 border-t border-neutral-700 transition-colors"
            >
              <span className="text-neutral-400">📊</span>
              Export as CSV
            </button>
            <button
              onClick={exportAsMarkdown}
              className="w-full px-4 py-3 text-left text-sm hover:bg-neutral-700 flex items-center gap-2 border-t border-neutral-700 transition-colors"
            >
              <span className="text-neutral-400">📝</span>
              Export as Markdown
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function sanitizeFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}
