import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ReceiptText,
  Clock,
  ShieldCheck,
  Activity,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { useGame } from "@/game/store";
import { useTransactions } from "@/game/hooks/useCoreState";
import { formatCurrency, formatProfitLoss } from "@/core/financial";
import { buildProfitLossReport } from "@/core/financial/reportBuilder";
import { formatTransactionSubcategory } from "@/core/transactions/transactionTypes";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { NumericValue } from "@/components/HorseBits";
import { FinancialChart } from "@/components/FinancialChart";

type PeriodKey = "week" | "month" | "year" | "allTime";

/**
 * Expanded Financial Report Component
 * Redesigned for the "Fiscal Performance Ledger" aesthetic
 */
export function FinancialReport() {
  const transactions = useTransactions();
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("month");

  const report = useMemo(() => buildProfitLossReport(transactions, day), [transactions, day]);

  const activePeriodData = useMemo(() => {
    switch (selectedPeriod) {
      case "week":
        return report.currentWeek;
      case "year":
        return report.currentYear;
      case "allTime":
        return report.allTime;
      default:
        return report.currentMonth;
    }
  }, [report, selectedPeriod]);

  const incomeBreakdown = [
    { label: "Prize Money", amount: activePeriodData.income.prizeMoney },
    { label: "Auction Sales", amount: activePeriodData.income.auctionSales },
    { label: "Private Sales", amount: activePeriodData.income.privateSales },
    { label: "Stud Fees", amount: activePeriodData.income.studFees },
    { label: "Claiming Sales", amount: activePeriodData.income.claimingSales },
  ].filter((i) => i.amount > 0);

  const expenseBreakdown = [
    { label: "Daily Upkeep", amount: activePeriodData.expenses.upkeep },
    { label: "Training", amount: activePeriodData.expenses.training },
    { label: "Race Entry Fees", amount: activePeriodData.expenses.entryFees },
    { label: "Jockey Fees", amount: activePeriodData.expenses.jockeyFees },
    { label: "Facility Maintenance", amount: activePeriodData.expenses.facilityMaintenance },
    { label: "Purchases", amount: activePeriodData.expenses.horsePurchases },
    { label: "Veterinary", amount: activePeriodData.expenses.veterinary },
    { label: "Breeding Fees", amount: activePeriodData.expenses.breedingFees },
    { label: "Transport", amount: activePeriodData.expenses.transport },
    { label: "Insurance", amount: activePeriodData.expenses.insurance },
  ].filter((e) => e.amount > 0);

  const recentTransactions = useMemo(
    () => [...transactions].reverse().slice(0, 50),
    [transactions],
  );

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Fiscal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-gold-bright uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <BarChart3 className="h-3.5 w-3.5" />
            Fiscal Oversight Division
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Financial Audit
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Audit Day: <NumericValue value={day} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Entries: <NumericValue value={transactions.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Status: <span className="text-success font-black">Healthy</span>
            </span>
          </div>
        </div>

        <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodKey)}>
          <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
            <TabsList className="bg-transparent h-9">
              <TabsTrigger
                value="week"
                className="uppercase text-[9px] font-black tracking-widest data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-4"
              >
                WEEK
              </TabsTrigger>
              <TabsTrigger
                value="month"
                className="uppercase text-[9px] font-black tracking-widest data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-4"
              >
                MONTH
              </TabsTrigger>
              <TabsTrigger
                value="year"
                className="uppercase text-[9px] font-black tracking-widest data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-4"
              >
                YEAR
              </TabsTrigger>
              <TabsTrigger
                value="allTime"
                className="uppercase text-[9px] font-black tracking-widest data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-4"
              >
                All Time
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Liquidity Gauge */}
        <Card className="bg-slate-950 border border-gold/40 rounded-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gold/20 group-hover:bg-gold transition-colors" />
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-[0.2em] text-gold-bright/60 flex items-center gap-1.5">
              <Wallet className="h-3 w-3" /> Cash on Hand
            </CardDescription>
            <CardTitle className="text-2xl font-black text-cream font-mono tracking-tighter tabular-nums pt-1">
              {formatCurrency(cash)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 border-t border-white/5 bg-black/20 py-2">
            <div className="text-[8px] font-mono text-cream/20 uppercase tracking-widest">
              Global Cash Balance
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border border-white/5 rounded-none shadow-xl border-l-2 border-l-success/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-[0.2em] text-success/60 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Period_Income
            </CardDescription>
            <CardTitle className="text-2xl font-black text-success font-mono tracking-tighter tabular-nums pt-1">
              {formatCurrency(activePeriodData.income.total)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 border-t border-white/5 bg-black/20 py-2">
            <div className="text-[8px] font-mono text-cream/20 uppercase tracking-widest">
              {activePeriodData.label}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border border-white/5 rounded-none shadow-xl border-l-2 border-l-destructive/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-[0.2em] text-destructive/60 flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" /> Period_Outflow
            </CardDescription>
            <CardTitle className="text-2xl font-black text-destructive font-mono tracking-tighter tabular-nums pt-1">
              {formatCurrency(activePeriodData.expenses.total)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 border-t border-white/5 bg-black/20 py-2">
            <div className="text-[8px] font-mono text-cream/20 uppercase tracking-widest">
              {activePeriodData.label}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "bg-slate-900/40 border border-white/5 rounded-none shadow-xl border-l-2",
            activePeriodData.netProfit >= 0 ? "border-l-success" : "border-l-destructive",
          )}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-[9px] uppercase font-black tracking-[0.2em] text-cream/40 flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Net_Yield
            </CardDescription>
            <CardTitle
              className={cn(
                "text-2xl font-black font-mono tracking-tighter tabular-nums pt-1",
                activePeriodData.netProfit >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {formatProfitLoss(activePeriodData.netProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 border-t border-white/5 bg-black/20 py-2 flex items-center justify-between">
            <div className="text-[8px] font-mono text-cream/20 uppercase tracking-widest">
              Yield Performance
            </div>
            <Badge
              variant={activePeriodData.netProfit >= 0 ? "default" : "destructive"}
              className="text-[8px] h-3.5 px-1 font-black uppercase rounded-none tracking-widest"
            >
              {activePeriodData.netProfit >= 0 ? "PROFIT" : "LOSS"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <section className="pt-4">
        <FinancialChart transactions={transactions} day={day} period={selectedPeriod} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Revenue Analysis */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <TrendingUp className="h-3.5 w-3.5 text-success/60" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
              Revenue Analysis
            </h2>
          </div>
          <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
            <CardContent className="p-6">
              {incomeBreakdown.length === 0 ? (
                <div className="py-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
                  Zero revenue data in current window
                </div>
              ) : (
                <div className="space-y-4">
                  {incomeBreakdown.map((item) => (
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
                          style={{
                            width: `${(item.amount / activePeriodData.income.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Operating Costs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
            <TrendingDown className="h-3.5 w-3.5 text-destructive/60" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
              Operating Costs
            </h2>
          </div>
          <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl">
            <CardContent className="p-6">
              {expenseBreakdown.length === 0 ? (
                <div className="py-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
                  Zero expense data in current window
                </div>
              ) : (
                <div className="space-y-4">
                  {expenseBreakdown.map((item) => (
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
                          style={{
                            width: `${(item.amount / activePeriodData.expenses.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Transaction Ledger */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <ReceiptText className="h-3.5 w-3.5 text-gold-muted/60" />
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-cream/40">
            System Audit Ledger
          </h2>
        </div>
        <Card className="bg-slate-900/20 border-white/5 rounded-none shadow-2xl overflow-hidden">
          <CardHeader className="bg-black/40 py-3 border-b border-white/10 flex flex-row items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gold-muted/60 px-4">
              Cash Movement Log
            </div>
            <div className="flex items-center gap-4 px-4">
              <span className="text-[10px] font-mono text-cream/20 uppercase">SAMPLE_50</span>
              <Badge
                variant="outline"
                className="border-white/10 text-cream/40 font-mono text-[9px] h-5 rounded-none"
              >
                {transactions.length} RECS
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black/20 border-b border-white/5">
                  <tr className="font-mono text-[9px] uppercase tracking-[0.2em] text-cream/30">
                    <th className="px-8 py-3 font-black w-1">D.OY</th>
                    <th className="px-4 py-3 font-black w-1">Date</th>
                    <th className="px-4 py-3 font-black">Sector</th>
                    <th className="px-4 py-3 font-black text-right">Amount</th>
                    <th className="px-8 py-3 font-black">Operational_Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentTransactions.map((t, idx) => (
                    <tr
                      key={t.id || idx}
                      className="group hover:bg-white/[0.02] transition-colors relative"
                    >
                      <td className="px-8 py-3 font-mono text-[10px] text-cream/20 group-hover:text-gold/40 transition-colors tabular-nums">
                        D{String(t.day).padStart(3, "0")}
                      </td>
                      <td className="px-4 py-3">
                        {t.type === "income" ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-success/60" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-destructive/60" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-black uppercase text-cream/40 tracking-widest px-1.5 py-0.5 border border-white/5 bg-black/40 rounded-sm">
                          {formatTransactionSubcategory(t.subcategory).toUpperCase()}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 font-black font-mono text-xs text-right tabular-nums tracking-tighter",
                          t.type === "income" ? "text-success" : "text-destructive",
                        )}
                      >
                        {formatProfitLoss(t.amount)}
                      </td>
                      <td className="px-8 py-3 text-[11px] font-mono text-cream/40 group-hover:text-cream/60 transition-colors uppercase italic truncate max-w-xs">
                        {t.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length === 0 && (
              <div className="py-20 text-center border-dashed border-white/5 opacity-40">
                <p className="font-mono text-xs uppercase tracking-widest">
                  No Fiscal Events Recorded
                </p>
              </div>
            )}
            <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-cream/20 uppercase tracking-widest">
              <span>Secured_Audit_Log</span>
              <span>End_Of_Ledger</span>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
