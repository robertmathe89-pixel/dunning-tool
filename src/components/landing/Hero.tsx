"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown } from "lucide-react";

interface HeroProps {
  onSimulate?: () => void;
}

export function Hero({ onSimulate }: HeroProps) {
  const handleScrollToDemo = () => {
    const demoSection = document.getElementById("simulate-demo");
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToProblem = () => {
    const problemSection = document.getElementById("problem-section");
    if (problemSection) {
      problemSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-[#0A0A0F] overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Tagline */}
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F59E0B] mb-6 animate-fade-in-up">
          Failed Payment Recovery
        </p>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Your customers chose you.
          <br />
          <span className="text-[#8A8A9E]">Not a faceless tool.</span>
        </h1>

        {/* Subhead */}
        <p className="text-lg sm:text-xl text-[#8A8A9E] max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          Recover failed subscription payments with personal emails that come from you — not a robot.{" "}
          <span className="text-white font-semibold">$29/mo.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Button
            size="lg"
            onClick={onSimulate || handleScrollToDemo}
            className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold px-8 py-6 text-lg rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Simulate a Failed Payment
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={handleScrollToProblem}
            className="text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24] px-8 py-6 text-lg rounded-full transition-all duration-200"
          >
            See how it works
            <ChevronDown className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Founder byline */}
        <p className="text-sm text-[#5A5A6E] animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          Built by Robert, a solo founder in Romania.
        </p>
      </div>
    </section>
  );
}
