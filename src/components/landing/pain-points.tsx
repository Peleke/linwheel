"use client";

import { useEffect, useRef, useState } from "react";

const painPoints = [
  "2 hours formatting one podcast into posts",
  "Staring at blank screens for hooks",
  "Same voice, same angle, every time",
  "Great insights dying in your notes app",
  "Posting once a week instead of daily",
];

export function PainPoints() {
  const [visible, setVisible] = useState<boolean[]>(new Array(painPoints.length).fill(false));
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Stagger the animations
          painPoints.forEach((_, i) => {
            setTimeout(() => {
              setVisible((prev) => {
                const next = [...prev];
                next[i] = true;
                return next;
              });
            }, i * 150);
          });
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden">
      {/* Blade divider effect at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />

      <div className="max-w-4xl mx-auto px-6">
        <div className="space-y-4 mb-12">
          {painPoints.map((point, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 text-lg md:text-xl transition-all duration-500 ${
                visible[i]
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8"
              }`}
            >
              <span className="text-red-500/70 text-2xl">×</span>
              <span className="text-neutral-400">{point}</span>
            </div>
          ))}
        </div>

        <div
          className={`transition-all duration-700 delay-700 ${
            visible[painPoints.length - 1]
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-2xl md:text-3xl font-medium text-neutral-300 mb-2">
            You&apos;re not lazy.
          </p>
          <p className="text-2xl md:text-3xl font-bold">
            Content creation is just <span className="gradient-text">friction.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
