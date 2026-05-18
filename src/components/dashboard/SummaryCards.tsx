"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users } from "lucide-react";

const stats = [
  {
    label: "Recovery Rate",
    value: "68%",
    change: "↑ 12%",
    icon: TrendingUp,
    color: "text-[#10B981]",
    bgColor: "bg-[#10B981]/10",
  },
  {
    label: "Revenue Recovered",
    value: "$1,247",
    change: "this month",
    icon: DollarSign,
    color: "text-[#F59E0B]",
    bgColor: "bg-[#F59E0B]/10",
  },
  {
    label: "Churn Prevented",
    value: "12",
    change: "customers",
    icon: Users,
    color: "text-[#8B5CF6]",
    bgColor: "bg-[#8B5CF6]/10",
  },
];

export function SummaryCards() {
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
