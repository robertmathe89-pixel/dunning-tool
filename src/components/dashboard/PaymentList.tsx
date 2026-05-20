"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, Zap, Loader2 } from "lucide-react";
import { PaymentRow, type Payment } from "./PaymentRow";
import { DetailPanel } from "./DetailPanel";
import { EmptyState } from "./EmptyState";

// Demo data shown when no real data exists yet
const demoPayments: Payment[] = [
  {
    id: "demo-1",
    name: "John Smith",
    email: "john@company.com",
    amount: 4900, // cents
    failedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "failed",
    reason: "Card expired",
    day: 1,
    tenure: "8 months",
    totalRevenue: 39200,
    isDemo: true,
    currency: "usd",
    retryCount: 0,
    customerName: "John Smith",
  },
  {
    id: "demo-2",
    name: "Sarah Chen",
    email: "sarah@startup.io",
    amount: 9900,
    failedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    status: "failed",
    reason: "Insufficient funds",
    day: 1,
    tenure: "2 years",
    totalRevenue: 237600,
    isDemo: true,
    currency: "usd",
    retryCount: 0,
    customerName: "Sarah Chen",
  },
  {
    id: "demo-3",
    name: "Mike Johnson",
    email: "mike@tech.co",
    amount: 2900,
    failedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    status: "recovered",
    reason: "Card expired",
    day: 3,
    tenure: "3 months",
    totalRevenue: 8700,
    isDemo: true,
    currency: "usd",
    retryCount: 2,
    customerName: "Mike Johnson",
  },
];

function formatFailedAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function PaymentList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRealData, setHasRealData] = useState(false);

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true);
        const res = await fetch("/api/failed-payments?status=all&limit=50");
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();
        const realPayments = (data.data || []).map((p: any) => ({
          id: p.id,
          name: p.customer_name || p.customer_email?.split("@")[0] || "Unknown",
          email: p.customer_email,
          amount: p.amount,
          failedAt: p.created_at,
          status: p.status,
          reason: p.failure_message || p.failure_code || "Unknown",
          day: (p.retry_count || 0) + 1,
          tenure: "—", // We don't have this from Stripe yet
          totalRevenue: p.amount * ((p.retry_count || 0) + 1), // Approximation
          isDemo: false,
          currency: p.currency || "usd",
          retryCount: p.retry_count || 0,
          customerName: p.customer_name,
        }));

        setPayments(realPayments.length > 0 ? realPayments : demoPayments);
        setHasRealData(realPayments.length > 0);
        setError(null);
      } catch (err: any) {
        console.error("[Dashboard] Failed to fetch payments:", err);
        setError(err.message);
        // Fallback to demo data on error
        setPayments(demoPayments);
        setHasRealData(false);
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, []);

  const filteredPayments = payments.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setDetailOpen(true);
  };

  if (loading) {
    return (
      <Card className="bg-[#111118] border-[#22222E]">
        <CardContent className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#F59E0B] animate-spin mb-4" />
          <p className="text-[#8A8A9E]">Loading payments...</p>
        </CardContent>
      </Card>
    );
  }

  // Show empty state only if no payments at all (not even demo)
  if (payments.length === 0) {
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
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""} need{filteredPayments.length === 1 ? "s" : ""} attention
                {!hasRealData && (
                  <span className="text-[#8B5CF6] ml-2">(demo data)</span>
                )}
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

          {error && (
            <div className="mb-4 p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg">
              <p className="text-sm text-[#EF4444]">
                Error loading data: {error}. Showing demo data.
              </p>
            </div>
          )}

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
              <PaymentRow
                key={payment.id}
                payment={payment}
                onSelect={handleSelectPayment}
                formatFailedAt={formatFailedAt}
                formatAmount={formatAmount}
              />
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
