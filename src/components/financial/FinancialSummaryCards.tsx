import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatProfitLoss } from "@/core/financial";
import { cn } from "@/lib/cn";
import { Wallet, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface PeriodData {
  label: string;
  income: { total: number };
  expenses: { total: number };
  netProfit: number;
}

interface FinancialSummaryCardsProps {
  cash: number;
  periodData: PeriodData;
}

export function FinancialSummaryCards({ cash, periodData }: FinancialSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="bg-slate-950 border border-gold/40 rounded-none shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gold/20 group-hover:bg-gold transition-colors" />
        <CardHeader className="pb-2">
          <CardDescription className="text-[9px] uppercase font-black tracking-wide text-gold-bright/60 flex items-center gap-1.5">
            <Wallet className="h-3 w-3" /> Cash on Hand
          </CardDescription>
          <CardTitle className="text-2xl font-black text-cream font-mono tracking-tighter tabular-nums pt-1">
            {formatCurrency(cash)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 border-t border-white/5 bg-black/20 py-2">
          <div className="text-[8px] font-mono text-cream/20 uppercase tracking-wide">
            Stable Cash Balance
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/40 border border-white/5 rounded-none shadow-xl border-l-2 border-l-success/40">
        <CardHeader className="pb-2">
          <CardDescription className="text-[9px] uppercase font-black tracking-wide text-success/60 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" /> Period Income
          </CardDescription>
          <CardTitle className="text-2xl font-black text-success font-mono tracking-tighter tabular-nums pt-1">
            {formatCurrency(periodData.income.total)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 border-t border-white/5 bg-black/20 py-2">
          <div className="text-[8px] font-mono text-cream/20 uppercase tracking-wide">
            {periodData.label}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/40 border border-white/5 rounded-none shadow-xl border-l-2 border-l-destructive/40">
        <CardHeader className="pb-2">
          <CardDescription className="text-[9px] uppercase font-black tracking-wide text-destructive/60 flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3" /> Period Outflow
          </CardDescription>
          <CardTitle className="text-2xl font-black text-destructive font-mono tracking-tighter tabular-nums pt-1">
            {formatCurrency(periodData.expenses.total)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 border-t border-white/5 bg-black/20 py-2">
          <div className="text-[8px] font-mono text-cream/20 uppercase tracking-wide">
            {periodData.label}
          </div>
        </CardContent>
      </Card>

      <Card
        className={cn(
          "bg-slate-900/40 border border-white/5 rounded-none shadow-xl border-l-2",
          periodData.netProfit >= 0 ? "border-l-success" : "border-l-destructive",
        )}
      >
        <CardHeader className="pb-2">
          <CardDescription className="text-[9px] uppercase font-black tracking-wide text-cream/40 flex items-center gap-1.5">
            <Activity className="h-3 w-3" /> Net Yield
          </CardDescription>
          <CardTitle
            className={cn(
              "text-2xl font-black font-mono tracking-tighter tabular-nums pt-1",
              periodData.netProfit >= 0 ? "text-success" : "text-destructive",
            )}
          >
            {formatProfitLoss(periodData.netProfit)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 border-t border-white/5 bg-black/20 py-2 flex items-center justify-between">
          <div className="text-[8px] font-mono text-cream/20 uppercase tracking-wide">
            Yield Performance
          </div>
          <Badge
            variant={periodData.netProfit >= 0 ? "default" : "destructive"}
            className="text-[8px] h-3.5 px-1 font-black uppercase rounded-none tracking-wide"
          >
            {periodData.netProfit >= 0 ? "PROFIT" : "LOSS"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
