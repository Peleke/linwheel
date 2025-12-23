"use client";

import Link from "next/link";
import { WaitlistForm } from "../waitlist-form";

export function CTASection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-purple-950/30 to-black" />

      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Stop letting insights
          <br />
          <span className="gradient-text">die in your head.</span>
        </h2>

        <p className="text-xl text-neutral-400 mb-10">
          One transcript. 90+ posts. Free to try.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/generate"
            className="glow-button px-8 py-4 rounded-xl text-lg font-medium text-white inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Your First Posts
          </Link>
        </div>

        {/* Waitlist section */}
        <div className="glass-card rounded-2xl p-8 max-w-md mx-auto">
          <h3 className="font-semibold mb-2">Join the waitlist</h3>
          <p className="text-sm text-neutral-400 mb-6">
            Get early access to new features: carousel export, image generation, and more.
          </p>
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
