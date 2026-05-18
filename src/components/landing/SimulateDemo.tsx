"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Mail, Send } from "lucide-react";

export function SimulateDemo() {
  const [showModal, setShowModal] = useState(false);

  return (
    <section className="py-24 bg-[#0A0A0F]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Label */}
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#F59E0B] mb-4">
          See It In Action
        </p>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
          Simulate a failed payment in 30 seconds
        </h2>
        <p className="text-lg text-[#8A8A9E] mb-12 max-w-2xl mx-auto">
          See exactly what your customers will experience when a payment fails.
        </p>

        {/* Email Preview Card */}
        <Card className="bg-[#111118] border-[#22222E] max-w-2xl mx-auto mb-8 transition-all duration-200 hover:border-[#333344]">
          <CardContent className="p-6 sm:p-8 text-left">
            {/* Email Header */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#22222E]">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B]/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">sarah@herstartup.com</p>
                <p className="text-xs text-[#5A5A6E]">To: john@customer.com</p>
              </div>
              <p className="text-xs text-[#5A5A6E] ml-auto">Just now</p>
            </div>

            {/* Email Subject */}
            <p className="text-sm text-[#8A8A9E] mb-4">
              Subject: <span className="text-white">HerStartup — Payment Issue</span>
            </p>

            {/* Email Body */}
            <div className="space-y-4 text-[#8A8A9E]">
              <p className="text-white">Hi John,</p>
              <p>
                Looks like your payment for HerStartup didn't go through. No worries — this happens to all of us.
              </p>
              <p>
                Most of the time it's just an expired card or a temporary hold from your bank.
              </p>
              <div className="py-4">
                <Button className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold rounded-lg transition-all duration-200">
                  Update Payment Method
                </Button>
              </div>
              <p>
                If you're having trouble, just reply to this email and I'll help sort it out.
              </p>
              <div className="pt-4">
                <p className="text-white">Best,</p>
                <p className="text-white">Sarah</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Button
          size="lg"
          onClick={() => setShowModal(true)}
          className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold px-8 py-6 text-lg rounded-full transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Try the simulation
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="bg-[#111118] border-[#22222E] text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-[#F59E0B]" />
                Email Preview
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-[#8A8A9E]">
                This is the exact email your customers will receive when a payment fails.
              </p>
              <div className="bg-[#0A0A0F] rounded-lg p-4 border border-[#22222E]">
                <p className="text-xs text-[#5A5A6E] mb-2">From: sarah@herstartup.com</p>
                <p className="text-sm text-white font-medium mb-4">HerStartup — Payment Issue</p>
                <p className="text-sm text-[#8A8A9E]">
                  Hi John, looks like your payment didn't go through. No worries — this happens...
                </p>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold transition-all duration-200">
                  Send Test to Me
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white transition-all duration-200"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
