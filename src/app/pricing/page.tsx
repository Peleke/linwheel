import Link from "next/link";
import { Header, Footer } from "@/components/landing";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying LinWheel",
    features: [
      { text: "10 generations", included: true },
      { text: "LinkedIn posts (7 angles)", included: true },
      { text: "Long-form articles", included: true },
      { text: "Carousel generation", included: true },
      { text: "Image generation", included: true },
      { text: "Priority support", included: false },
    ],
    cta: "Get Started Free",
    ctaLink: "/login",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For serious content creators",
    features: [
      { text: "Unlimited generations", included: true },
      { text: "LinkedIn posts (7 angles)", included: true },
      { text: "Long-form articles", included: true },
      { text: "Carousel generation", included: true },
      { text: "Image generation", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Upgrade to Pro",
    ctaLink: "/login?upgrade=true",
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />

      <main className="pt-32 pb-24">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-purple-950/20 pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Simple <span className="gradient-text">Pricing</span>
            </h1>
            <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
              Start free with 10 generations. Upgrade to Pro for unlimited access.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? "glass-card border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                    : "glass-card"
                }`}
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
                <h2 className="text-xl font-semibold mb-2">{plan.name}</h2>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-5xl font-bold">{plan.price}</span>
                  <span className="text-neutral-400 text-lg">{plan.period}</span>
                </div>

                {/* Description */}
                <p className="text-neutral-400 mb-8">{plan.description}</p>

                {/* CTA */}
                <Link
                  href={plan.ctaLink}
                  className={`block w-full text-center py-4 px-6 rounded-xl font-medium transition-all mb-8 ${
                    plan.highlighted
                      ? "glow-button text-white"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {plan.cta}
                </Link>

                {/* Features */}
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-center gap-3">
                      {feature.included ? (
                        <svg
                          className={`w-5 h-5 flex-shrink-0 ${
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
                      ) : (
                        <svg
                          className="w-5 h-5 flex-shrink-0 text-neutral-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      )}
                      <span
                        className={
                          feature.included ? "text-neutral-300" : "text-neutral-600"
                        }
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* FAQ / Trust */}
          <div className="mt-20 text-center">
            <p className="text-neutral-500 mb-8">
              Cancel anytime. No questions asked.
            </p>

            <div className="glass-card rounded-2xl p-8 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-4">
                Questions? We&apos;ve got answers.
              </h3>
              <div className="space-y-4 text-left">
                <div>
                  <p className="font-medium text-neutral-200">
                    What counts as a generation?
                  </p>
                  <p className="text-neutral-400 text-sm">
                    Each transcript you process counts as one generation. You get
                    21+ posts, 3 articles, and carousels from each generation.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-neutral-200">
                    Can I upgrade later?
                  </p>
                  <p className="text-neutral-400 text-sm">
                    Yes! Start free and upgrade anytime. Your existing content is
                    preserved.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-neutral-200">
                    What payment methods do you accept?
                  </p>
                  <p className="text-neutral-400 text-sm">
                    We accept all major credit cards via Stripe. Secure and encrypted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
