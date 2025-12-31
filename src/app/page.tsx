import {
  Header,
  Hero,
  PainPoints,
  HowItWorks,
  VisualFeatures,
  AnglesGrid,
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
        <VisualFeatures />
        <AnglesGrid />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
