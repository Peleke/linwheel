"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    // Mock submission - in production, this would hit an API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Store in localStorage for now (mock)
    const waitlist = JSON.parse(localStorage.getItem("linwheel_waitlist") || "[]");
    waitlist.push({ email, timestamp: new Date().toISOString() });
    localStorage.setItem("linwheel_waitlist", JSON.stringify(waitlist));

    setStatus("success");
    setEmail("");
  };

  if (status === "success") {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
        You&apos;re on the list. We&apos;ll reach out when new features drop.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 disabled:opacity-50"
      >
        {status === "loading" ? "Joining..." : "Join waitlist"}
      </button>
    </form>
  );
}
