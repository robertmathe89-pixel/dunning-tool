"use client";

import { Card, CardContent } from "@/components/ui/card";

export function ProblemSection() {
  return (
    <section id="problem-section" className="py-24 bg-[#111118]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F59E0B] mb-4">
          The Problem
        </p>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
          20-40% of payments fail every month
        </h2>

        {/* Body */}
        <p className="text-lg text-[#8A8A9E] max-w-3xl mb-16">
          Expired cards. Bank holds. Insufficient funds. Most tools recover payments — but they send robotic emails from a faceless domain. Your customers can tell the difference.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard
            value="20-40%"
            label="fail"
            sublabel="monthly"
          />
          <StatCard
            value="Most"
            label="founders never"
            sublabel="follow up"
            highlight
          />
          <StatCard
            value="$249/mo"
            label="for tools"
            sublabel="that don't care"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({ value, label, sublabel, highlight = false }: { value: string; label: string; sublabel: string; highlight?: boolean }) {
  return (
    <Card className={`bg-[#0A0A0F] border-[#22222E] transition-all duration-200 hover:border-[#333344] hover:-translate-y-1 ${highlight ? 'border-[#F59E0B]/30' : ''}`}>
      <CardContent className="p-6 text-center">
        <p className={`text-3xl sm:text-4xl font-bold mb-2 ${highlight ? 'text-[#F59E0B]' : 'text-white'}`}>
          {value}
        </p>
        <p className="text-[#8A8A9E] text-sm">{label}</p>
        <p className="text-[#5A5A6E] text-xs">{sublabel}</p>
      </CardContent>
    </Card>
  );
}
