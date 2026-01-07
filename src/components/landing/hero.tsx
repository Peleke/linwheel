"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ParticleBackground } from "./particle-background";

const contentTypes = [
  "podcast transcripts",
  "book chapters",
  "research papers",
  "meeting notes",
  "conference talks",
  "white papers",
];

export function Hero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsExiting(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % contentTypes.length);
        setIsExiting(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern" />
      <ParticleBackground />

      {/* AI-generated hero visual */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/promo/hero-visual.png"
          alt=""
          fill
          className="object-cover opacity-30 mix-blend-screen"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
      </div>

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-neutral-300">Now in public beta</span>
        </div>

        {/* Headline - three lines for clean layout */}
        <h1 className="animate-fade-up-delay-1 text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.15]">
          {/* Line 1: Turn */}
          <span className="block">Turn</span>
          {/* Line 2: [rotating content type] */}
          <span className="block relative overflow-hidden h-[1.2em] mb-1">
            <span
              className={`absolute inset-x-0 text-indigo-400 transition-all duration-300 ease-out ${
                isExiting
                  ? "translate-y-full opacity-0"
                  : "translate-y-0 opacity-100"
              }`}
            >
              {contentTypes[currentIndex]}
            </span>
          </span>
          {/* Line 3: into LinkedIn gold. */}
          <span className="block">
            into <span className="gradient-text">LinkedIn gold.</span>
          </span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up-delay-2 text-lg sm:text-xl md:text-2xl text-neutral-400 mb-4 max-w-3xl mx-auto leading-relaxed">
          Paste any content. Get <span className="text-white font-medium">90+ ready-to-post</span> pieces{" "}
          in <span className="text-white font-medium">6 distinct voices</span>—with <span className="text-emerald-400 font-medium">AI cover images</span>.
        </p>

        {/* Social proof line */}
        <p className="animate-fade-up-delay-2 text-neutral-500 mb-10">
          One piece of content <strong className="text-white font-semibold">stops the scroll for a month.</strong>
        </p>

        {/* CTAs */}
        <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/login"
            className="glow-button px-8 py-4 rounded-xl text-lg font-medium text-white inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Get Started — Free
          </Link>
          <Link
            href="#how"
            className="px-8 py-4 rounded-xl text-lg font-medium border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all inline-flex items-center justify-center gap-2"
          >
            See How It Works
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Link>
        </div>

        {/* Stats preview */}
        <div className="animate-fade-up-delay-3 flex flex-wrap justify-center gap-6 md:gap-12 pb-20 md:pb-0">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">90+</div>
            <div className="text-sm text-neutral-500">Posts per source</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">6</div>
            <div className="text-sm text-neutral-500">Distinct angles</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-emerald-400">AI</div>
            <div className="text-sm text-neutral-500">Cover images</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">&lt;60s</div>
            <div className="text-sm text-neutral-500">Generation time</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator - hidden on mobile to avoid overlap */}
      <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
