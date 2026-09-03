/**
 * StatCard.tsx - Shared label/value/sub stat card
 *
 * Consolidates the identical `Stat` (ExchangePanel) and `SummaryCard`
 * (portfolio) components. `JockeyReportPanel.Stat` has a different signature
 * (ReactNode value, no sub) and is intentionally NOT consolidated here.
 */

import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  sub,
  size = "lg",
}: {
  label: string;
  value: string;
  sub: string;
  size?: "sm" | "lg" | "xl";
}) {
  return (
    <Card className="border-white/5 bg-slate-900/40">
      <CardContent className="p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-cream-muted">{label}</p>
        <p
          className={`font-bold tabular-nums text-cream ${
            size === "xl" ? "text-xl" : size === "lg" ? "text-lg" : "text-base"
          }`}
        >
          {value}
        </p>
        <p className="text-[10px] text-cream-muted mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}
