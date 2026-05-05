import { createFileRoute } from "@tanstack/react-router";
import { FinancialReport } from "@/components/FinancialReport";

export const Route = createFileRoute("/financial-report")({
  component: FinancialReportPage,
});

function FinancialReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream">Financial Report</h1>
        <p className="text-cream-muted mt-1">
          Stable profitability and expense breakdown
        </p>
      </div>
      <FinancialReport />
    </div>
  );
}
