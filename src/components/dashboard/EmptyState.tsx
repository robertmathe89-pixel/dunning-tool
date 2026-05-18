"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, ArrowRight } from "lucide-react";

export function EmptyState() {
  return (
    <Card className="bg-[#111118] border-[#22222E]">
      <CardContent className="p-12 text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-6">
          <Zap className="w-8 h-8 text-[#F59E0B]" />
        </div>

        {/* Headline */}
        <h3 className="text-xl font-semibold text-white mb-2">
          No failed payments yet
        </h3>
        <p className="text-[#8A8A9E] max-w-md mx-auto mb-8">
          Connect your Stripe account to start seeing failed payments, or simulate one to see how Dunning Tool works.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold px-8 rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 mr-2" />
            Simulate a Failure
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24] px-8 rounded-full"
          >
            Connect Stripe
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
