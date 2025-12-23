"use client";

import Link from "next/link";
import { ParticleBackground } from "./particle-background";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern" />
      <ParticleBackground />

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

        {/* Headline */}
        <h1 className="animate-fade-up-delay-1 text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Turn podcast noise into
          <br />
          <span className="gradient-text">LinkedIn gold.</span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up-delay-2 text-xl md:text-2xl text-neutral-400 mb-4 max-w-3xl mx-auto leading-relaxed">
          Paste a transcript. Get <span className="text-white font-medium">90+ ready-to-post</span> content pieces
          <br className="hidden md:block" />
          in <span className="text-white font-medium">6 distinct voices</span>. In under 60 seconds.
        </p>

        {/* Social proof line */}
        <p className="animate-fade-up-delay-2 text-neutral-500 mb-10">
          One transcript = a month of LinkedIn content
        </p>

        {/* CTAs */}
        <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link
            href="/generate"
            className="glow-button px-8 py-4 rounded-xl text-lg font-medium text-white inline-flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Start Generating — Free
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
        <div className="animate-fade-up-delay-3 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">90+</div>
            <div className="text-sm text-neutral-500">Posts per transcript</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">6</div>
            <div className="text-sm text-neutral-500">Distinct angles</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold gradient-text">&lt;60s</div>
            <div className="text-sm text-neutral-500">Generation time</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
