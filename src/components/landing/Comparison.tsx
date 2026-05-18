"use client";

import { Check, X } from "lucide-react";

const features = [
  { name: "Sends from your email", dunning: true, churnBuster: false },
  { name: "Personal signature", dunning: true, churnBuster: false },
  { name: "Founder-in-the-loop", dunning: true, churnBuster: false },
  { name: "Lightweight editor", dunning: true, churnBuster: false },
  { name: "Stripe integration", dunning: true, churnBuster: true },
  { name: "Recovery analytics", dunning: true, churnBuster: true },
];

export function Comparison() {
  return (
    <section className="py-24 bg-[#0A0A0F]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F59E0B] mb-4">
            Comparison
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Why founders choose us
          </h2>
        </div>

        {/* Table */}
        <div className="border border-[#22222E] rounded-xl overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-3 bg-[#111118] border-b border-[#22222E]">
            <div className="p-4 text-sm font-semibold text-[#8A8A9E]">Feature</div>
            <div className="p-4 text-sm font-semibold text-[#8A8A9E] text-center">Churn Buster</div>
            <div className="p-4 text-sm font-semibold text-[#F59E0B] text-center bg-[#F59E0B]/5">Dunning Tool</div>
          </div>

          {/* Feature rows */}
          {features.map((feature) => (
            <div key={feature.name} className="grid grid-cols-3 border-b border-[#22222E] last:border-0">
              <div className="p-4 text-sm text-white">{feature.name}</div>
              <div className="p-4 flex justify-center">
                {feature.churnBuster ? (
                  <Check className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <X className="w-5 h-5 text-[#EF4444]" />
                )}
              </div>
              <div className="p-4 flex justify-center bg-[#F59E0B]/5">
                {feature.dunning ? (
                  <Check className="w-5 h-5 text-[#10B981]" />
                ) : (
                  <X className="w-5 h-5 text-[#EF4444]" />
                )}
              </div>
            </div>
          ))}

          {/* Price row */}
          <div className="grid grid-cols-3 bg-[#111118] border-t border-[#22222E]">
            <div className="p-4 text-sm font-semibold text-white">Price</div>
            <div className="p-4 text-center text-[#8A8A9E] font-semibold">$249/mo</div>
            <div className="p-4 text-center text-[#F59E0B] font-bold text-lg bg-[#F59E0B]/5">$29/mo</div>
          </div>
        </div>
      </div>
    </section>
  );
}
