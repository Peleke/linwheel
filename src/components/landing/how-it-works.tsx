"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const steps = [
  {
    number: "01",
    title: "Paste",
    description: "Drop your podcast transcript from Podscribe, Descript, or any source. We clean timestamps, speaker labels, all of it.",
    image: "/promo/step-01-paste.png",
  },
  {
    number: "02",
    title: "Extract",
    description: "Our agents find the non-obvious claims. The 'I've felt this but never said it' moments that drive engagement.",
    image: "/promo/step-02-extract.png",
  },
  {
    number: "03",
    title: "Post",
    description: "Get 90+ posts with AI-generated cover images. Turn articles into 5-slide carousels. Download and post from your phone.",
    image: "/promo/step-03-post.png",
  },
];

export function HowItWorks() {
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
      id="how"
      ref={sectionRef}
      className="py-24 md:py-32 relative overflow-hidden"
    >
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/promo/how-it-works-bg.png"
          alt=""
          fill
          className="object-cover opacity-30 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
      </div>

      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-transparent z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2
            className={`text-3xl md:text-5xl font-bold mb-4 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            How It Works
          </h2>
          <p
            className={`text-lg text-neutral-400 transition-all duration-700 delay-100 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Three steps. Sixty seconds. Ninety posts with images.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`glass-card rounded-2xl overflow-hidden transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              {/* Step image */}
              <div className="relative h-40 bg-gradient-to-br from-indigo-900/30 to-purple-900/30">
                <Image
                  src={step.image}
                  alt={step.title}
                  fill
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-3 left-4 text-5xl font-bold text-white/20">{step.number}</span>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-2xl font-semibold mb-3">{step.title}</h3>
                <p className="text-neutral-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
