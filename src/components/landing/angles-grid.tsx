"use client";

import { useEffect, useRef, useState } from "react";

const angles = [
  {
    name: "Contrarian",
    emoji: "🔥",
    description: "Challenge the consensus",
    example: "Everyone's wrong about AI. Here's why.",
    gradient: "from-red-500/20 to-orange-500/20",
    border: "hover:border-red-500/30",
  },
  {
    name: "Field Note",
    emoji: "📓",
    description: "Share what you observed",
    example: "Spent 6 months testing this. Here's what I found.",
    gradient: "from-green-500/20 to-emerald-500/20",
    border: "hover:border-green-500/30",
  },
  {
    name: "Demystify",
    emoji: "🔍",
    description: "Strip the glamour",
    example: "The 'overnight success' story nobody tells you.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    border: "hover:border-blue-500/30",
  },
  {
    name: "Identity",
    emoji: "🪞",
    description: "Validate the outliers",
    example: "If you've ever felt like a fraud at work...",
    gradient: "from-purple-500/20 to-pink-500/20",
    border: "hover:border-purple-500/30",
  },
  {
    name: "Provocateur",
    emoji: "💣",
    description: "Stir debate with edge",
    example: "Hot take: Your KPIs are lying to you.",
    gradient: "from-yellow-500/20 to-amber-500/20",
    border: "hover:border-yellow-500/30",
  },
  {
    name: "Synthesizer",
    emoji: "🧩",
    description: "Connect dots across fields",
    example: "What jazz improv teaches us about hiring.",
    gradient: "from-indigo-500/20 to-violet-500/20",
    border: "hover:border-indigo-500/30",
  },
];

export function AnglesGrid() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="angles"
      ref={sectionRef}
      className="py-24 md:py-32 relative"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2
            className={`text-3xl md:text-5xl font-bold mb-4 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            6 Angles. <span className="gradient-text">90+ Posts.</span> One Click.
          </h2>
          <p
            className={`text-lg text-neutral-400 transition-all duration-700 delay-100 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Each insight gets rewritten in 6 distinct voices for maximum reach.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {angles.map((angle, i) => (
            <div
              key={angle.name}
              className={`group glass-card rounded-2xl p-6 cursor-default transition-all duration-700 ${angle.border} ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: `${200 + i * 100}ms` }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${angle.gradient} flex items-center justify-center text-2xl`}
                >
                  {angle.emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{angle.name}</h3>
                  <p className="text-sm text-neutral-500">{angle.description}</p>
                </div>
              </div>

              {/* Example hook */}
              <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/5">
                <p className="text-sm text-neutral-400 mb-1">Example hook:</p>
                <p className="text-neutral-200 italic">&ldquo;{angle.example}&rdquo;</p>
              </div>
            </div>
          ))}
        </div>

        {/* Curious Cat addition */}
        <div
          className={`mt-8 text-center transition-all duration-700 delay-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-neutral-500">
            + <span className="text-neutral-300">Curious Cat</span> angle for question-driven posts
          </p>
        </div>
      </div>
    </section>
  );
}
