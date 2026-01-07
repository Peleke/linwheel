import {
  Header,
  Hero,
  PainPoints,
  HowItWorks,
  AnglesGrid,
  Pricing,
  CTASection,
  Footer,
} from "@/components/landing";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />
      <main>
        <Hero />
        <PainPoints />
        <HowItWorks />
        <AnglesGrid />
        <Pricing />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
