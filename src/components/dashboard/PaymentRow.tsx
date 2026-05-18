"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Send, SkipForward } from "lucide-react";

export interface Payment {
  id: number;
  name: string;
  email: string;
  amount: number;
  failedAt: string;
  status: "pending" | "recovered" | "churned";
  reason: string;
  day: number;
  tenure: string;
  totalRevenue: number;
  isDemo: boolean;
}

interface PaymentRowProps {
  payment: Payment;
  onSelect: (payment: Payment) => void;
}

export function PaymentRow({ payment, onSelect }: PaymentRowProps) {
  const statusColors = {
    pending: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20",
    recovered: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20",
    churned: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20",
  };

  const leftBorderColor = {
    pending: "border-l-[#F59E0B]",
    recovered: "border-l-[#10B981]",
    churned: "border-l-[#EF4444]",
  };

  return (
    <div
      onClick={() => onSelect(payment)}
      className={`border-b border-[#22222E] last:border-0 border-l-2 ${leftBorderColor[payment.status]} hover:bg-[#1A1A24]/50 transition-colors duration-200 cursor-pointer`}
    >
      {/* Desktop Table Row */}
      <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-4 items-center">
        {/* Customer */}
        <div className="col-span-4 lg:col-span-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-[#F59E0B]">
                {payment.name[0]}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">
                {payment.name}
              </p>
              <p className="text-xs text-[#5A5A6E] truncate">{payment.email}</p>
            </div>
            {payment.isDemo && (
              <Badge
                variant="outline"
                className="bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20 text-xs flex-shrink-0"
              >
                DEMO
              </Badge>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="col-span-2">
          <p className="text-sm text-white font-medium">${payment.amount}/mo</p>
          <p className="text-xs text-[#5A5A6E]">{payment.reason}</p>
        </div>

        {/* Failed */}
        <div className="col-span-2">
          <p className="text-sm text-[#8A8A9E]">{payment.failedAt}</p>
          <p className="text-xs text-[#5A5A6E]">Day {payment.day} of 4</p>
        </div>

        {/* Status */}
        <div className="col-span-2">
          <Badge
            variant="outline"
            className={`${statusColors[payment.status]} text-xs capitalize`}
          >
            {payment.status}
          </Badge>
        </div>

        {/* Actions */}
        <div className="col-span-2 lg:col-span-3 flex items-center justify-end gap-1">
          {payment.status === "pending" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24]"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#8A8A9E] hover:text-[#10B981] hover:bg-[#10B981]/10"
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[#8A8A9E] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </>
          )}
          {payment.status === "recovered" && (
            <span className="text-xs text-[#10B981]">Card updated</span>
          )}
          {payment.status === "churned" && (
            <span className="text-xs text-[#EF4444]">Account closed</span>
          )}
        </div>
      </div>

      {/* Mobile Card */}
      <div className="sm:hidden">
        <div className="p-4 space-y-3">
          {/* Top row: Avatar + Name + Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-[#F59E0B]">
                  {payment.name[0]}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">
                  {payment.name}
                </p>
                <p className="text-xs text-[#5A5A6E] truncate">{payment.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {payment.isDemo && (
                <Badge
                  variant="outline"
                  className="bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20 text-xs"
                >
                  DEMO
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`${statusColors[payment.status]} text-xs capitalize`}
              >
                {payment.status}
              </Badge>
            </div>
          </div>

          {/* Details row */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-white font-medium">${payment.amount}/mo</p>
              <p className="text-xs text-[#5A5A6E]">{payment.reason}</p>
            </div>
            <div className="text-right">
              <p className="text-[#8A8A9E]">{payment.failedAt}</p>
              <p className="text-xs text-[#5A5A6E]">Day {payment.day} of 4</p>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {payment.status === "pending" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24]"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-[#8A8A9E] hover:text-[#10B981] hover:bg-[#10B981]/10"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Send
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-[#8A8A9E] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                >
                  <SkipForward className="w-3 h-3 mr-1" />
                  Skip
                </Button>
              </>
            )}
            {payment.status === "recovered" && (
              <span className="text-xs text-[#10B981]">Card updated</span>
            )}
            {payment.status === "churned" && (
              <span className="text-xs text-[#EF4444]">Account closed</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
