"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

const features = [
  "Unlimited failed payments",
  "4 email templates",
  "Personal touch editing",
  "Recovery analytics",
  "Send from your email",
  "24h auto-fallback",
];

export function Pricing() {
  return (
    <section className="py-24 bg-[#111118]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F59E0B] mb-4">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Simple, honest pricing
          </h2>
        </div>

        {/* Pricing Card */}
        <Card className="bg-[#0A0A0F] border-[#22222E] max-w-md mx-auto transition-all duration-200 hover:border-[#333344]">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <p className="text-5xl font-bold text-white mb-2">$29</p>
              <p className="text-lg text-[#8A8A9E]">/mo</p>
              <p className="text-sm text-[#5A5A6E] mt-2">Flat. No tiers. No BS.</p>
            </div>

            <div className="space-y-4 mb-8">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F59E0B]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F59E0B]" />
                  </div>
                  <span className="text-[#8A8A9E]">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold py-6 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Free — First 3 recoveries
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
