"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying LinWheel",
    features: [
      "10 generations",
      "LinkedIn posts (7 angles)",
      "Long-form articles",
      "Carousel generation",
      "Image generation",
    ],
    cta: "Get Started",
    ctaLink: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For serious content creators",
    features: [
      "Unlimited generations",
      "LinkedIn posts (7 angles)",
      "Long-form articles",
      "Carousel generation",
      "Image generation",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    ctaLink: "/login?upgrade=true",
    highlighted: true,
  },
];

export function Pricing() {
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
      id="pricing"
      ref={sectionRef}
      className="py-24 md:py-32 relative"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/10 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2
            className={`text-3xl md:text-5xl font-bold mb-4 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Simple <span className="gradient-text">Pricing</span>
          </h2>
          <p
            className={`text-lg text-neutral-400 transition-all duration-700 delay-100 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              } ${
                plan.highlighted
                  ? "glass-card border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                  : "glass-card"
              }`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              {/* Popular badge */}
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan name */}
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-neutral-400">{plan.period}</span>
              </div>

              {/* Description */}
              <p className="text-neutral-400 mb-6">{plan.description}</p>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 ${
                        plan.highlighted ? "text-indigo-400" : "text-green-500"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.ctaLink}
                className={`block w-full text-center py-3 px-6 rounded-xl font-medium transition-all ${
                  plan.highlighted
                    ? "glow-button text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Trust badge */}
        <p
          className={`text-center text-neutral-500 text-sm mt-12 transition-all duration-700 delay-500 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
        >
          Cancel anytime. No questions asked.
        </p>
      </div>
    </section>
  );
}
