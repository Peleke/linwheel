"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const features = [
  {
    image: "/promo/feature-ai-cover.png",
    title: "AI Cover Images",
    description: "Every post gets a custom image prompt. Generate scroll-stopping visuals in one click.",
    gradient: "from-emerald-500/20 to-teal-500/20",
    border: "hover:border-emerald-500/40",
  },
  {
    image: "/promo/feature-carousel.png",
    title: "Carousel Generator",
    description: "Turn articles into 5-slide carousels. Perfect for LinkedIn's algorithm-favorite format.",
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "hover:border-amber-500/40",
  },
  {
    image: "/promo/feature-download.png",
    title: "One-Tap Download",
    description: "Download any image or carousel for mobile posting. No desktop required.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    border: "hover:border-blue-500/40",
  },
  {
    image: "/promo/feature-regenerate.png",
    title: "Regenerate Anytime",
    description: "Not happy with a result? Regenerate any image or slide until it's perfect.",
    gradient: "from-purple-500/20 to-pink-500/20",
    border: "hover:border-purple-500/40",
  },
];

const stats = [
  { value: "2x", label: "more engagement", sublabel: "Posts with images vs text-only" },
  { value: "3x", label: "more shares", sublabel: "Carousel posts vs single images" },
  { value: "98%", label: "of top posts", sublabel: "Include visual content" },
];

export function VisualFeatures() {
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
      id="visuals"
      ref={sectionRef}
      className="py-24 md:py-32 relative overflow-hidden"
    >
      {/* Parallax Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{ transform: `translateY(${scrollY * 50}px)` }}
      >
        <Image
          src="/promo/visual-features-bg.png"
          alt=""
          fill
          className="object-cover opacity-30 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
      </div>

      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-emerald-950/10 to-black z-0" />

      {/* Floating orbs with parallax */}
      <div
        className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"
        style={{ transform: `translateY(${scrollY * 100}px)` }}
      />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"
        style={{ transform: `translateY(${scrollY * -80}px)` }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
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
                <p className="text-white text-sm font-medium">Raw content → Polished posts</p>
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
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300"
              style={{ transform: `translateY(${scrollY * (20 + i * 10)}px)` }}
            >
              <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">
                {stat.value}
              </div>
              <div className="text-neutral-200 font-medium">{stat.label}</div>
              <div className="text-sm text-neutral-500">{stat.sublabel}</div>
            </div>
          ))}
        </div>

        {/* Features grid with images */}
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group glass-card rounded-2xl overflow-hidden transition-all duration-700 ${feature.border} ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{
                transitionDelay: `${400 + i * 100}ms`,
              }}
            >
              {/* Card image header */}
              <div className={`relative h-32 bg-gradient-to-br ${feature.gradient}`}>
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  className="object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* Card content */}
              <div className="p-6">
                <h3 className="font-semibold text-lg text-neutral-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Visual preview hint - ensure proper spacing on mobile */}
        <div
          className={`mt-16 md:mt-12 pt-4 text-center transition-all duration-700 delay-700 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-neutral-500 text-sm">
            Powered by <span className="text-emerald-400 font-medium">Flux.1</span> AI image generation
          </p>
        </div>
      </div>
    </section>
  );
}
