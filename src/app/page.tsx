import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SimulateDemo } from "@/components/landing/SimulateDemo";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Comparison } from "@/components/landing/Comparison";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F]">
      <LandingNav />
      <div className="pt-14">
        <Hero onSimulate={() => {
          const el = document.getElementById("simulate-demo");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }} />
        <ProblemSection />
        <SimulateDemo />
        <HowItWorks />
        <Comparison />
        <Pricing />
        <Footer />
      </div>
    </main>
  );
}
