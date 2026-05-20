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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Send, CheckCircle, Clock, Loader2 } from "lucide-react";

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
  onStatusChange?: (id: string, status: string) => void;
}

export function DetailPanel({ payment, open, onOpenChange, onStatusChange }: DetailPanelProps) {
  const [psNote, setPsNote] = useState("");
  const [tone, setTone] = useState("friendly");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);
  const [markingRecovered, setMarkingRecovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  const handleSendEmail = async () => {
    if (!isActive) return;
    setSending(true);
    setSendError("");
    setSendSuccess(false);

    try {
      const res = await fetch(`/api/failed-payments/${payment.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          psNote: psNote || undefined,
          tone: tone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error || data.details || "Failed to send email");
        return;
      }

      setSendSuccess(true);
      // Reset after 3 seconds
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      setSendError(err.message || "Network error");
    } finally {
      setSending(false);
    }
  };

  const handleMarkRecovered = async () => {
    setMarkingRecovered(true);
    try {
      const res = await fetch(`/api/failed-payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "recovered" }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("[DETAIL] Mark recovered failed:", data);
        return;
      }

      // Notify parent to refresh the list
      onStatusChange?.(payment.id, "recovered");
    } catch (err) {
      console.error("[DETAIL] Mark recovered error:", err);
    } finally {
      setMarkingRecovered(false);
    }
  };

  const getEmailPreviewBody = () => {
    const customerName = payment.name || "there";
    const productName = "Dunning Tool";
    const founderName = "Robert";
    const companyName = "Dunning Tool";

    const toneMap: Record<string, { opening: string; closing: string }> = {
      friendly: {
        opening: `Hey ${customerName},\n\nLooks like your payment for ${companyName} didn't go through. No worries — this happens to all of us.`,
        closing: `If you're having trouble, just reply to this email and I'll help sort it out.\n\nBest,\n${founderName}`,
      },
      urgent: {
        opening: `Hi ${customerName},\n\nYour payment for ${companyName} failed and your account will be suspended soon. Please update your payment method to avoid losing access.`,
        closing: `Please update your payment within 24 hours to keep your account active.\n\nThanks,\n${founderName}`,
      },
      apologetic: {
        opening: `Hi ${customerName},\n\nI'm really sorry — your payment for ${companyName} didn't go through. This is usually just a card update or bank hold.`,
        closing: `I hate to bother you, but I want to make sure you don't lose access. Just reply if you need help.\n\nThanks so much,\n${founderName}`,
      },
    };

    const t = toneMap[tone] || toneMap.friendly;

    return `${t.opening}\n\nMost of the time it's just an expired card or a temporary hold from your bank.\n\n[Update Payment Method Button]\n\n${t.closing}${psNote ? `\n\nP.S. ${psNote}` : ""}`;
  };

  return (
    <>
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
                <p className="text-sm text-white">Robert</p>
                {psNote && (
                  <p className="text-sm text-[#F59E0B] mt-2">P.S. {psNote}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-[#22222E] space-y-3">
              {sendError && (
                <p className="text-sm text-[#EF4444] text-center">{sendError}</p>
              )}
              {sendSuccess && (
                <p className="text-sm text-[#10B981] text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Email sent!
                </p>
              )}
              <Button
                onClick={handleSendEmail}
                disabled={!isActive || sending}
                className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Email Now
                  </>
                )}
              </Button>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowPreview(true)}
                  variant="outline"
                  className="flex-1 border-[#22222E] text-white hover:bg-[#1A1A24] hover:text-white"
                >
                  Preview
                </Button>
                <Button
                  onClick={handleMarkRecovered}
                  disabled={markingRecovered || !isActive}
                  variant="outline"
                  className="flex-1 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10"
                >
                  {markingRecovered ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Mark Recovered"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="bg-[#111118] border-[#22222E] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-[#F59E0B]" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[#8A8A9E] text-sm">
              This is the email your customer will receive.
            </p>
            <div className="bg-[#0A0A0F] rounded-lg p-4 border border-[#22222E]">
              <p className="text-xs text-[#5A5A6E] mb-2">
                From: ai.studioprojects2025@gmail.com
              </p>
              <p className="text-sm text-white font-medium mb-4">
                Dunning Tool — Payment Issue
              </p>
              <div className="whitespace-pre-wrap text-sm text-[#8A8A9E] space-y-2">
                {getEmailPreviewBody().split("\n").map((line, i) => (
                  <p key={i} className={line.startsWith("P.S.") ? "text-[#F59E0B]" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
            <Button
              onClick={() => setShowPreview(false)}
              className="w-full bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold"
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
