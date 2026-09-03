import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/core/financial";
import { TrendingUp } from "lucide-react";

interface RevenueItem {
  label: string;
  amount: number;
}

interface RevenueAnalysisPanelProps {
  items: RevenueItem[];
  total: number;
}

export function RevenueAnalysisPanel({ items, total }: RevenueAnalysisPanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <TrendingUp className="h-3.5 w-3.5 text-success/60" />
        <h2 className="text-[10px] font-black uppercase tracking-wide text-cream/40">
          Income Analysis
        </h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
        <CardContent className="p-6">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-wide italic">
              Zero income data in current window
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-cream/60 uppercase tracking-tight">
                      {item.label}
                    </span>
                    <span className="font-mono text-xs font-black text-success tabular-nums">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success/60 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                      style={{ width: total > 0 ? `${(item.amount / total) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
