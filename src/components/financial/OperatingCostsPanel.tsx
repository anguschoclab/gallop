import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/core/financial";
import { TrendingDown } from "lucide-react";

interface ExpenseItem {
  label: string;
  amount: number;
}

interface OperatingCostsPanelProps {
  items: ExpenseItem[];
  total: number;
}

export function OperatingCostsPanel({ items, total }: OperatingCostsPanelProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <TrendingDown className="h-3.5 w-3.5 text-destructive/60" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">Operating Costs</h2>
      </div>
      <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
        <CardContent className="p-6">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
              Zero expense data in current window
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-cream/60 uppercase tracking-tight">
                      {item.label}
                    </span>
                    <span className="font-mono text-xs font-black text-destructive tabular-nums">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-destructive/60 shadow-[0_0_8px_rgba(239,68,68,0.4)]"
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
