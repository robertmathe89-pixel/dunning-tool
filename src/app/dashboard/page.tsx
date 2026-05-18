import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { PaymentList } from "@/components/dashboard/PaymentList";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <SummaryCards />

      {/* Payment List */}
      <PaymentList />
    </div>
  );
}
