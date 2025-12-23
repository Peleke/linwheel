"use client";

import { useEffect, useState, useCallback } from "react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Listen for keyboard events
  useEffect(() => {
    const handleCopy = () => {
      addToast("Copied to clipboard!", "success");
    };

    const handleApprove = () => {
      addToast("Post approved!", "success");
    };

    window.addEventListener("keyboard-copy", handleCopy);
    window.addEventListener("keyboard-approve", handleApprove);
    window.addEventListener("toast", ((e: CustomEvent) => {
      addToast(e.detail.message, e.detail.type || "success");
    }) as EventListener);

    return () => {
      window.removeEventListener("keyboard-copy", handleCopy);
      window.removeEventListener("keyboard-approve", handleApprove);
      window.removeEventListener("toast", (() => {}) as EventListener);
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-fade-up flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-green-600"
              : toast.type === "error"
              ? "bg-red-600"
              : "bg-blue-600"
          }`}
        >
          {toast.type === "success" && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.message}
        </div>
      ))}
    </div>
  );
}

// Utility to trigger toast from anywhere
export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  window.dispatchEvent(
    new CustomEvent("toast", { detail: { message, type } })
  );
}
