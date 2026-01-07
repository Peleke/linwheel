"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const angles = [
  {
    name: "Contrarian",
    image: "/promo/angle-contrarian.png",
    description: "Challenge the consensus",
    example: "Everyone's wrong about AI. Here's why.",
    gradient: "from-red-500/20 to-orange-500/20",
    border: "hover:border-red-500/40",
    glow: "bg-red-500/20",
  },
  {
    name: "Field Note",
    image: "/promo/angle-field-note.png",
    description: "Share what you observed",
    example: "Spent 6 months testing this. Here's what I found.",
    gradient: "from-green-500/20 to-emerald-500/20",
    border: "hover:border-green-500/40",
    glow: "bg-emerald-500/20",
  },
  {
    name: "Demystify",
    image: "/promo/angle-demystify.png",
    description: "Strip the glamour",
    example: "The 'overnight success' story nobody tells you.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    border: "hover:border-blue-500/40",
    glow: "bg-blue-500/20",
  },
  {
    name: "Identity",
    image: "/promo/angle-identity.png",
    description: "Validate the outliers",
    example: "If you've ever felt like a fraud at work...",
    gradient: "from-purple-500/20 to-pink-500/20",
    border: "hover:border-purple-500/40",
    glow: "bg-purple-500/20",
  },
  {
    name: "Provocateur",
    image: "/promo/angle-provocateur.png",
    description: "Stir debate with edge",
    example: "Hot take: Your KPIs are lying to you.",
    gradient: "from-yellow-500/20 to-amber-500/20",
    border: "hover:border-yellow-500/40",
    glow: "bg-amber-500/20",
  },
  {
    name: "Synthesizer",
    image: "/promo/angle-synthesizer.png",
    description: "Connect dots across fields",
    example: "What jazz improv teaches us about hiring.",
    gradient: "from-indigo-500/20 to-violet-500/20",
    border: "hover:border-indigo-500/40",
    glow: "bg-indigo-500/20",
  },
];

export function AnglesGrid() {
  const [visible, setVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const scrollProgress = -rect.top / window.innerHeight;
        setScrollY(scrollProgress);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      id="angles"
      ref={sectionRef}
      className="py-24 md:py-32 relative overflow-hidden"
    >
      {/* Parallax Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${scrollY * 40}px)` }}
      >
        <Image
          src="/promo/angles-bg.png"
          alt=""
          fill
          className="object-cover opacity-25 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
      </div>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-indigo-950/10 to-black z-0" />

      {/* Floating orbs with parallax */}
      <div
        className="absolute top-32 right-20 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"
        style={{ transform: `translateY(${scrollY * 80}px)` }}
      />
      <div
        className="absolute bottom-32 left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
        style={{ transform: `translateY(${scrollY * -60}px)` }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl"
        style={{ transform: `translate(-50%, -50%) translateY(${scrollY * 30}px)` }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-sm text-indigo-400 font-medium">Multi-Voice Engine</span>
          </div>

          <h2
            className={`text-3xl md:text-5xl font-bold mb-4 transition-all duration-700 delay-100 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            6 Angles. <span className="gradient-text">90+ Posts.</span>{" "}
            <span className="text-indigo-400">AI Images.</span>
          </h2>
          <p
            className={`text-lg text-neutral-400 max-w-2xl mx-auto transition-all duration-700 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Each insight gets rewritten in 6 distinct voices—with custom cover images
            to make every post pop.
          </p>
        </div>

        {/* Angles grid with images */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {angles.map((angle, i) => (
            <div
              key={angle.name}
              className={`group glass-card rounded-2xl overflow-hidden cursor-default transition-all duration-700 ${angle.border} ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{
                transitionDelay: `${300 + i * 100}ms`,
                transform: visible ? `translateY(${scrollY * (8 + i * 4)}px)` : undefined,
              }}
            >
              {/* Card image header */}
              <div className={`relative h-28 bg-gradient-to-br ${angle.gradient}`}>
                <Image
                  src={angle.image}
                  alt={angle.name}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Glow effect on hover */}
                <div className={`absolute inset-0 ${angle.glow} opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-xl`} />
              </div>

              {/* Card content */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-lg text-neutral-100">{angle.name}</h3>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-neutral-400">
                    {angle.description}
                  </span>
                </div>

                {/* Example hook */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/5 group-hover:bg-white/10 transition-colors duration-300">
                  <p className="text-xs text-neutral-500 mb-1">Example hook:</p>
                  <p className="text-sm text-neutral-300 italic">&ldquo;{angle.example}&rdquo;</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Curious Cat addition with visual flair */}
        <div
          className={`mt-12 text-center transition-all duration-700 delay-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
            <span className="text-2xl">🐱</span>
            <span className="text-neutral-400">
              + <span className="text-neutral-200 font-medium">Curious Cat</span> angle for question-driven posts
            </span>
          </div>
        </div>

        {/* Visual preview hint */}
        <div
          className={`mt-8 text-center transition-all duration-700 delay-800 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-neutral-500 text-sm">
            Powered by <span className="text-indigo-400 font-medium">Claude AI</span> voice rewriting
          </p>
        </div>
      </div>
    </section>
  );
}
