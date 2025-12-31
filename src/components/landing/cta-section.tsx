"use client";

import Link from "next/link";
import Image from "next/image";

export function CTASection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/promo/cta-bg.png"
          alt=""
          fill
          className="object-cover opacity-50 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]" />
      </div>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-purple-950/30 to-black z-0" />

      {/* Glow orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl z-0" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-6">
          Stop letting insights
          <br />
          <span className="gradient-text">die in your head.</span>
        </h2>

        <p className="text-xl text-neutral-400 mb-10">
          One transcript. 90+ posts with AI images. Free to try.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="glow-button px-8 py-4 rounded-xl text-lg font-medium text-white inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Create Free Account
          </Link>
        </div>
      </div>
    </section>
  );
}
