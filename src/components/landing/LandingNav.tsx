"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bird } from "lucide-react";

export function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#22222E] bg-[#0A0A0F]/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Bird className="w-6 h-6 text-[#F59E0B]" />
            <span className="text-white font-semibold">Dunning Tool</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-[#8A8A9E] hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Button
              asChild
              size="sm"
              className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold"
            >
              <Link href="/onboarding">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
