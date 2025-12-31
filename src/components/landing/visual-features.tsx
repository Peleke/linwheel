"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: "AI Cover Images",
    description: "Every post gets a custom image prompt. Generate scroll-stopping visuals in one click.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: "Carousel Generator",
    description: "Turn articles into 5-slide carousels. Perfect for LinkedIn's algorithm-favorite format.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    title: "One-Tap Download",
    description: "Download any image or carousel for mobile posting. No desktop required.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: "Regenerate Anytime",
    description: "Not happy with a result? Regenerate any image or slide until it's perfect.",
  },
];

const stats = [
  { value: "2x", label: "more engagement", sublabel: "Posts with images vs text-only" },
  { value: "3x", label: "more shares", sublabel: "Carousel posts vs single images" },
  { value: "98%", label: "of top posts", sublabel: "Include visual content" },
];

export function VisualFeatures() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="visuals"
      ref={sectionRef}
      className="py-24 md:py-32 relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/10 to-black" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-emerald-400 font-medium">Visual Content Engine</span>
          </div>

          <h2
            className={`text-3xl md:text-5xl font-bold mb-4 transition-all duration-700 delay-100 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Images that <span className="text-emerald-400">stop the scroll.</span>
          </h2>

          <p
            className={`text-lg text-neutral-400 max-w-2xl mx-auto transition-all duration-700 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            LinkedIn&apos;s algorithm loves visuals. We generate custom cover images and carousels
            for every piece of content—so you stand out in the feed.
          </p>
        </div>

        {/* Visual showcase - AI generated images */}
        <div
          className={`mb-16 transition-all duration-700 delay-250 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <div className="grid md:grid-cols-2 gap-6">
            {/* Transformation visual */}
            <div className="relative aspect-video rounded-2xl overflow-hidden group">
              <Image
                src="/promo/visual-showcase-1.png"
                alt="Content transformation visualization"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-sm font-medium">Raw transcript → Polished content</p>
                <p className="text-neutral-400 text-xs">AI transforms chaos into engagement</p>
              </div>
            </div>

            {/* Carousel visual */}
            <div className="relative aspect-video rounded-2xl overflow-hidden group">
              <Image
                src="/promo/visual-showcase-2.png"
                alt="Carousel generation visualization"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-sm font-medium">5-slide carousels, one click</p>
                <p className="text-neutral-400 text-xs">LinkedIn&apos;s favorite content format</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div
          className={`grid md:grid-cols-3 gap-6 mb-16 transition-all duration-700 delay-300 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-6 rounded-2xl bg-white/5 border border-white/5"
            >
              <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">
                {stat.value}
              </div>
              <div className="text-neutral-200 font-medium">{stat.label}</div>
              <div className="text-sm text-neutral-500">{stat.sublabel}</div>
            </div>
          ))}
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group glass-card rounded-2xl p-6 transition-all duration-700 hover:border-emerald-500/30 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: `${400 + i * 100}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-neutral-100 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual preview hint */}
        <div
          className={`mt-12 text-center transition-all duration-700 delay-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-neutral-500 text-sm">
            Powered by <span className="text-neutral-400">Flux.1</span> AI image generation
          </p>
        </div>
      </div>
    </section>
  );
}
