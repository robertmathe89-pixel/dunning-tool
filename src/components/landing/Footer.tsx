"use client";

import { Bird } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 bg-[#0A0A0F] border-t border-[#22222E]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Bird className="w-6 h-6 text-[#F59E0B]" />
            <span className="text-white font-semibold">Dunning Tool</span>
          </div>

          {/* Tagline */}
          <p className="text-sm text-[#5A5A6E]">
            Built by founders, for founders.
          </p>

          {/* Links */}
          <div className="flex items-center gap-6">
            <span className="text-sm text-[#5A5A6E]">
              Privacy (soon)
            </span>
            <span className="text-sm text-[#5A5A6E]">
              Terms (soon)
            </span>
            <a href="mailto:ai.studioprojects2025@gmail.com" className="text-sm text-[#8A8A9E] hover:text-white transition-colors duration-200">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
