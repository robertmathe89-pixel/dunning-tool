"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, Loader2 } from "lucide-react";

interface AnalyticsData {
  recoveryRate: number;
  revenueRecovered: number;
  churnPrevented: number;
  totalFailed: number;
  recoveredCount: number;
}

export function SummaryCards() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics?days=30");
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const result = await res.json();
        setData(result.data || {
          recoveryRate: 0,
          revenueRecovered: 0,
          churnPrevented: 0,
          totalFailed: 0,
          recoveredCount: 0,
        });
      } catch (err) {
        console.error("[Dashboard] Analytics fetch failed:", err);
        // Keep defaults on error
        setData({
          recoveryRate: 0,
          revenueRecovered: 0,
          churnPrevented: 0,
          totalFailed: 0,
          recoveredCount: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-[#111118] border-[#22222E]">
            <CardContent className="p-6 flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Recovery Rate",
      value: `${data.recoveryRate.toFixed(1)}%`,
      change: data.totalFailed > 0
        ? `${data.recoveredCount} of ${data.totalFailed} recovered`
        : "No data yet",
      icon: TrendingUp,
      color: "text-[#10B981]",
      bgColor: "bg-[#10B981]/10",
    },
    {
      label: "Revenue Recovered",
      value: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(data.revenueRecovered / 100),
      change: "last 30 days",
      icon: DollarSign,
      color: "text-[#F59E0B]",
      bgColor: "bg-[#F59E0B]/10",
    },
    {
      label: "Churn Prevented",
      value: String(data.churnPrevented),
      change: "customers",
      icon: Users,
      color: "text-[#8B5CF6]",
      bgColor: "bg-[#8B5CF6]/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className="bg-[#111118] border-[#22222E] transition-all duration-200 hover:border-[#333344] hover:-translate-y-0.5"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`text-xs font-medium ${stat.color}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
              {stat.value}
            </p>
            <p className="text-sm text-[#8A8A9E]">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
