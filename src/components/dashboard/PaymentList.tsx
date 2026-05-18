"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, Zap } from "lucide-react";
import { PaymentRow, type Payment } from "./PaymentRow";
import { DetailPanel } from "./DetailPanel";
import { EmptyState } from "./EmptyState";

const demoPayments: Payment[] = [
  {
    id: 1,
    name: "John Smith",
    email: "john@company.com",
    amount: 49,
    failedAt: "2 hours ago",
    status: "pending",
    reason: "Card expired",
    day: 1,
    tenure: "8 months",
    totalRevenue: 392,
    isDemo: true,
  },
  {
    id: 2,
    name: "Sarah Chen",
    email: "sarah@startup.io",
    amount: 99,
    failedAt: "5 hours ago",
    status: "pending",
    reason: "Insufficient funds",
    day: 1,
    tenure: "2 years",
    totalRevenue: 2376,
    isDemo: false,
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike@tech.co",
    amount: 29,
    failedAt: "1 day ago",
    status: "recovered",
    reason: "Card expired",
    day: 3,
    tenure: "3 months",
    totalRevenue: 87,
    isDemo: false,
  },
];

export function PaymentList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<typeof demoPayments[0] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredPayments = demoPayments.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPayment = (payment: typeof demoPayments[0]) => {
    setSelectedPayment(payment);
    setDetailOpen(true);
  };

  // Show empty state if no demo payments (will be replaced with real data check later)
  if (demoPayments.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <Card className="bg-[#111118] border-[#22222E]">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Failed Payments</h2>
              <p className="text-sm text-[#5A5A6E] mt-1">
                {filteredPayments.length} payments need attention
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5A5A6E]" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#0A0A0F] border-[#22222E] text-white placeholder:text-[#5A5A6E] w-full sm:w-64"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                className="border-[#22222E] text-[#8A8A9E] hover:text-white hover:bg-[#1A1A24]"
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                className="bg-[#F59E0B] hover:bg-[#D97706] text-[#0A0A0F] font-semibold"
              >
                <Zap className="w-4 h-4 mr-2" />
                Simulate
              </Button>
            </div>
          </div>

          {/* Table Header — hidden on mobile */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-3 text-xs font-medium text-[#5A5A6E] uppercase tracking-wider border-b border-[#22222E]">
            <div className="col-span-4 lg:col-span-3">Customer</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Failed</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 lg:col-span-3 text-right">Actions</div>
          </div>

          {/* Rows */}
          {filteredPayments.length > 0 ? (
            filteredPayments.map((payment) => (
              <PaymentRow key={payment.id} payment={payment} onSelect={handleSelectPayment} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-[#5A5A6E]">No payments found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Panel */}
      <DetailPanel
        payment={selectedPayment}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
