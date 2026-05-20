"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Send, CheckCircle, Clock } from "lucide-react";

interface PaymentDetail {
  id: string;
  name: string;
  email: string;
  amount: number; // cents
  failedAt: string;
  status: "failed" | "dunning" | "recovered" | "abandoned" | "cancelled" | "pending";
  reason: string;
  day: number;
  tenure: string;
  totalRevenue: number;
  isDemo: boolean;
  currency: string;
  retryCount: number;
  customerName?: string;
}

interface DetailPanelProps {
  payment: PaymentDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetailPanel({ payment, open, onOpenChange }: DetailPanelProps) {
  const [psNote, setPsNote] = useState("");
  const [tone, setTone] = useState("friendly");

  if (!payment) return null;

  const displayStatus = payment.status === "failed" || payment.status === "dunning" || payment.status === "pending"
    ? "pending"
    : payment.status === "recovered"
      ? "recovered"
      : "churned";

  const isActive = payment.status === "failed" || payment.status === "dunning" || payment.status === "pending";

  const formatAmount = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

  const formatRevenue = (cents: number, currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);

  const emailTimeline = [
    { day: 1, status: "sent", label: "Day 1 — Sent" },
    { day: 3, status: "pending", label: "Day 3 — Pending" },
    { day: 7, status: "pending", label: "Day 7 — Pending" },
    { day: 14, status: "pending", label: "Day 14 — Pending" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[480px] bg-[#111118] border-l border-[#22222E] p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b border-[#22222E]">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24]"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <SheetTitle className="text-lg font-semibold text-white">
                Payment Details
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 px-6 py-6 space-y-6">
            {/* Customer Info */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                  <span className="text-lg font-medium text-[#F59E0B]">
                    {payment.name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold">{payment.name}</p>
                  <p className="text-sm text-[#8A8A9E]">{payment.email}</p>
                </div>
                {payment.isDemo && (
                  <Badge className="bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20">
                    DEMO
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#5A5A6E]">Customer for</p>
                  <p className="text-white">{payment.tenure}</p>
                </div>
                <div>
                  <p className="text-[#5A5A6E]">Total revenue</p>
                  <p className="text-white">{formatRevenue(payment.totalRevenue, payment.currency)}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-[#22222E]" />

            {/* Payment Details */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Payment Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8A8A9E]">Amount</span>
                  <span className="text-white font-medium">{formatAmount(payment.amount, payment.currency)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8A9E]">Reason</span>
                  <span className="text-white">{payment.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8A9E]">Failed</span>
                  <span className="text-white">{payment.failedAt}</span>
                </div>
              </div>
            </div>

            <Separator className="bg-[#22222E]" />

            {/* Email Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Email Timeline</h3>
              <div className="space-y-3">
                {emailTimeline.map((item) => (
                  <div key={item.day} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      item.status === "sent"
                        ? "bg-[#10B981]/20"
                        : "bg-[#22222E]"
                    }`}>
                      {item.status === "sent" ? (
                        <CheckCircle className="w-3 h-3 text-[#10B981]" />
                      ) : (
                        <Clock className="w-3 h-3 text-[#5A5A6E]" />
                      )}
                    </div>
                    <span className={`text-sm ${
                      item.status === "sent" ? "text-white" : "text-[#5A5A6E]"
                    }`}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-[#22222E]" />

            {/* Personal Touch */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Personal Touch</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#5A5A6E] mb-1 block">P.S. Note</label>
                  <Input
                    placeholder="Add a personal note..."
                    value={psNote}
                    onChange={(e) => setPsNote(e.target.value)}
                    className="bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#5A5A6E] mb-1 block">Tone</label>
                  <Select value={tone} onValueChange={(value) => setTone(value || "friendly")}>
                    <SelectTrigger className="bg-[#0A0A0F] border-[#22222E] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111118] border-[#22222E]">
                      <SelectItem value="friendly" className="text-white hover:bg-[#1A1A24]">
                        Friendly
                      </SelectItem>
                      <SelectItem value="urgent" className="text-white hover:bg-[#1A1A24]">
                        Urgent
                      </SelectItem>
                      <SelectItem value="apologetic" className="text-white hover:bg-[#1A1A24]">
                        Apologetic
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Signature Preview */}
            <div className="bg-[#0A0A0F] rounded-lg p-4 border border-[#22222E]">
              <p className="text-xs text-[#5A5A6E] mb-2">Signature Preview</p>
              <p className="text-sm text-white">Best,</p>
              <p className="text-sm text-white">Sarah</p>
              {psNote && (
                <p className="text-sm text-[#F59E0B] mt-2">P.S. {psNote}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-[#22222E] space-y-3">
            <Button
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Email Now
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white"
              >
                Preview
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10"
              >
                Mark Recovered
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
