"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface SlideVersion {
  id: string;
  versionNumber: number;
  prompt: string;
  headlineText: string;
  caption?: string;
  imageUrl?: string;
  isActive: boolean;
  generatedAt?: string;
  generationProvider?: string;
}

interface SlideVersionHistoryProps {
  articleId: string;
  slideNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onVersionActivated?: () => void;
}

export function SlideVersionHistory({
  articleId,
  slideNumber,
  isOpen,
  onClose,
  onVersionActivated,
}: SlideVersionHistoryProps) {
  const [versions, setVersions] = useState<SlideVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    if (!isOpen || !slideNumber) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/articles/${articleId}/carousel/versions?slide=${slideNumber}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }
      const data = await response.json();
      setVersions(data.versions || []);
      setActiveVersionId(data.activeVersionId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setLoading(false);
    }
  }, [articleId, slideNumber, isOpen]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleActivateVersion = async (versionId: string) => {
    if (activating || versionId === activeVersionId) return;

    setActivating(versionId);
    setError(null);

    try {
      const response = await fetch(
        `/api/articles/${articleId}/carousel/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slideNumber, versionId }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to activate version");
      }

      setActiveVersionId(versionId);
      // Update local state
      setVersions((prev) =>
        prev.map((v) => ({
          ...v,
          isActive: v.id === versionId,
        }))
      );

      if (onVersionActivated) {
        onVersionActivated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate version");
    } finally {
      setActivating(null);
    }
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
      return () => {
        window.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 top-[10%] bottom-[10%] md:left-1/2 md:top-1/2 md:bottom-auto md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-[700px] md:max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[10000] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Slide {slideNumber} Versions
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select a version to use in your carousel
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="w-8 h-8 animate-spin text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="text-sm text-slate-500">Loading versions...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">⚠️</span>
                    <p className="text-sm text-red-500">{error}</p>
                    <button
                      onClick={fetchVersions}
                      className="mt-3 text-sm text-indigo-500 hover:text-indigo-600"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : versions.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <span className="text-3xl mb-2 block">📭</span>
                    <p className="text-sm text-slate-500">No versions found</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {versions.map((version) => (
                    <button
                      key={version.id}
                      onClick={() => handleActivateVersion(version.id)}
                      disabled={activating !== null}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                        version.isActive
                          ? "border-indigo-500 ring-2 ring-indigo-500/30"
                          : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                      } ${activating === version.id ? "opacity-70" : ""}`}
                    >
                      {/* Image */}
                      <div className="aspect-square relative bg-slate-100 dark:bg-slate-800">
                        {version.imageUrl ? (
                          <Image
                            src={version.imageUrl}
                            alt={`Version ${version.versionNumber}`}
                            fill
                            className="object-cover"
                            sizes="200px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <span className="text-2xl">🖼️</span>
                          </div>
                        )}

                        {/* Version number badge */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
                          <span className="text-white text-xs font-medium">
                            v{version.versionNumber}
                          </span>
                        </div>

                        {/* Active indicator */}
                        {version.isActive && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-indigo-500 rounded-full">
                            <span className="text-white text-xs font-medium">
                              Active
                            </span>
                          </div>
                        )}

                        {/* Activating spinner */}
                        {activating === version.id && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 animate-spin text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Hover overlay */}
                        {!version.isActive && activating !== version.id && (
                          <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/20 transition-colors flex items-center justify-center">
                            <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg">
                              Use this version
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="p-2 bg-white dark:bg-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {version.generatedAt
                            ? new Date(version.generatedAt).toLocaleDateString()
                            : "Generated"}
                          {version.generationProvider && (
                            <span className="ml-1 text-slate-400">
                              · {version.generationProvider}
                            </span>
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                Click a version to select it for your carousel. The PDF will automatically update.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render modal in a portal to escape any overflow:hidden containers
  return createPortal(modalContent, document.body);
}
