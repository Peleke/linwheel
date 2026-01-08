"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface ScheduledPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    type: "post" | "article";
    title: string;
    fullText: string;
    imageUrl?: string;
    scheduledAt: Date;
    runId: string;
    sourceLabel?: string;
  } | null;
  onReschedule: (id: string, type: "post" | "article", newDate: Date) => Promise<void>;
  onUnschedule: (id: string, type: "post" | "article") => Promise<void>;
}

export function ScheduledPostModal({
  isOpen,
  onClose,
  item,
  onReschedule,
  onUnschedule,
}: ScheduledPostModalProps) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [showUnscheduleConfirm, setShowUnscheduleConfirm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("09:00");
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowReschedule(false);
      setShowUnscheduleConfirm(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleReschedule = useCallback(async () => {
    if (!item || !selectedDate) return;

    setIsLoading(true);
    try {
      const newDate = new Date(`${selectedDate}T${selectedTime}`);
      await onReschedule(item.id, item.type, newDate);
      onClose();
    } catch (error) {
      console.error("Failed to reschedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [item, selectedDate, selectedTime, onReschedule, onClose]);

  const handleUnschedule = useCallback(async () => {
    if (!item) return;

    setIsLoading(true);
    try {
      await onUnschedule(item.id, item.type);
      onClose();
    } catch (error) {
      console.error("Failed to unschedule:", error);
    } finally {
      setIsLoading(false);
    }
  }, [item, onUnschedule, onClose]);

  // Quick date options
  const getQuickDates = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return [
      { label: "Tomorrow", date: tomorrow },
      { label: "Next week", date: nextWeek },
    ];
  };

  if (!item) return null;

  const isPost = item.type === "post";
  const formattedDate = item.scheduledAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedTime = item.scheduledAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            data-testid="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            data-testid="scheduled-post-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className={`px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between ${
              isPost ? "bg-blue-50 dark:bg-blue-900/20" : "bg-purple-50 dark:bg-purple-900/20"
            }`}>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-lg ${
                  isPost
                    ? "bg-blue-500 text-white"
                    : "bg-purple-500 text-white"
                }`}>
                  {isPost ? "Post" : "Article"}
                </span>
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Scheduled
                </span>
              </div>
              <button
                data-testid="close-modal-button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Image preview */}
              {item.imageUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 500px"
                  />
                </div>
              )}

              {/* Title/Hook */}
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  {item.title}
                </h3>
              </div>

              {/* Full text */}
              <div data-testid="post-full-text" className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 overflow-x-auto">
                  {item.fullText}
                </pre>
              </div>

              {/* Scheduled time */}
              <div
                data-testid="scheduled-time"
                className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {formattedDate}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {formattedTime}
                  </p>
                </div>
              </div>

              {/* Source run link */}
              <Link
                href={`/results/${item.runId}`}
                data-testid="view-source-link"
                className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    View source run
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.sourceLabel || "Original generation"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Reschedule panel */}
              <AnimatePresence>
                {showReschedule && (
                  <motion.div
                    data-testid="datetime-picker"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl space-y-4">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Choose new date and time
                      </p>

                      {/* Quick date options */}
                      <div className="flex gap-2">
                        {getQuickDates().map(({ label, date }) => (
                          <button
                            key={label}
                            data-testid={`date-option-${label.toLowerCase().replace(" ", "-")}`}
                            onClick={() => setSelectedDate(date.toISOString().split("T")[0])}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              selectedDate === date.toISOString().split("T")[0]
                                ? "bg-blue-500 text-white"
                                : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Date and time inputs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            Date
                          </label>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            Time
                          </label>
                          <input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                      </div>

                      {/* Confirm button */}
                      <button
                        data-testid="confirm-reschedule"
                        onClick={handleReschedule}
                        disabled={!selectedDate || isLoading}
                        className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                      >
                        {isLoading ? "Rescheduling..." : "Confirm reschedule"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Unschedule confirmation */}
              <AnimatePresence>
                {showUnscheduleConfirm && (
                  <motion.div
                    data-testid="unschedule-confirmation"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-3">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        Remove from schedule?
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        This will move the {isPost ? "post" : "article"} back to your queue.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowUnscheduleConfirm(false)}
                          className="flex-1 py-2 px-4 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          data-testid="confirm-unschedule"
                          onClick={handleUnschedule}
                          disabled={isLoading}
                          className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                        >
                          {isLoading ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
              <button
                data-testid="reschedule-button"
                onClick={() => {
                  setShowReschedule(!showReschedule);
                  setShowUnscheduleConfirm(false);
                }}
                className={`flex-1 py-2.5 px-4 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  showReschedule
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Reschedule
              </button>
              <button
                data-testid="unschedule-button"
                onClick={() => {
                  setShowUnscheduleConfirm(!showUnscheduleConfirm);
                  setShowReschedule(false);
                }}
                className={`flex-1 py-2.5 px-4 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${
                  showUnscheduleConfirm
                    ? "bg-red-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Unschedule
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
