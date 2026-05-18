"use client";

import { CreditCard, Eye, RefreshCw } from "lucide-react";

const steps = [
  {
    icon: CreditCard,
    title: "Connect Stripe",
    description: "Paste your API key. We listen for failed payments in real-time.",
  },
  {
    icon: Eye,
    title: "Review & Personalize",
    description: "See each failure with customer context. Add a personal touch.",
  },
  {
    icon: RefreshCw,
    title: "Recover & Track",
    description: "Emails sent from YOUR address. Track recovery rate and revenue saved.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-[#111118]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F59E0B] mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Three steps to recover revenue
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-[#22222E] to-transparent" />
              )}
              
              <div className="bg-[#0A0A0F] border border-[#22222E] rounded-xl p-8 transition-all duration-200 hover:border-[#333344] hover:-translate-y-1">
                {/* Step number */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-[#F59E0B]" />
                  </div>
                  <span className="text-2xl font-bold text-[#5A5A6E]">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-[#8A8A9E]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
