import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft,
  ReceiptText,
  Clock
} from "lucide-react";
import { useGame } from "@/game/store";
import { formatCurrency, formatProfitLoss } from "@/core/financial";
import { buildProfitLossReport } from "@/core/financial/reportBuilder";
import { formatTransactionSubcategory } from "@/core/transactions/transactionTypes";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type PeriodKey = "week" | "month" | "year" | "allTime";

/**
 * Expanded Financial Report Component
 * Provides comprehensive Profit & Loss reporting and transaction history.
 */
export function FinancialReport() {
  const transactions = useGame((s) => s.transactions || []);
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("month");

  const report = useMemo(() => buildProfitLossReport(transactions, day), [transactions, day]);

  const activePeriodData = useMemo(() => {
    switch (selectedPeriod) {
      case "week": return report.currentWeek;
      case "year": return report.currentYear;
      case "allTime": return report.allTime;
      default: return report.currentMonth;
    }
  }, [report, selectedPeriod]);

  const incomeBreakdown = [
    { label: "Prize Money", amount: activePeriodData.income.prizeMoney },
    { label: "Auction Sales", amount: activePeriodData.income.auctionSales },
    { label: "Private Sales", amount: activePeriodData.income.privateSales },
    { label: "Stud Fees", amount: activePeriodData.income.studFees },
    { label: "Claiming Sales", amount: activePeriodData.income.claimingSales },
  ].filter(i => i.amount > 0);

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
  ].filter(e => e.amount > 0);

  const recentTransactions = useMemo(() => 
    [...transactions].reverse().slice(0, 50), 
  [transactions]);

  return (
    <div className="space-y-6">
      {/* Top Bar: Cash & Period Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">Financial Audit</h2>
          <p className="text-cream-muted font-mono text-xs mt-1 tabular-nums flex items-center gap-1">
            <Clock className="w-3 h-3" /> Day {day} of stable operations
          </p>
        </div>
        
        <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodKey)}>
          <TabsList className="bg-t800 border-gold-muted/20">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="allTime">All-Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1 bg-t900 border-gold shadow-lg shadow-gold/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-gold-muted flex items-center gap-1">
              <Wallet className="w-3 h-3" /> Liquid Assets
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-cream font-mono">{formatCurrency(cash)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
             <div className="text-[10px] text-cream-muted italic">Total cash on hand</div>
          </CardContent>
        </Card>

        <Card className="bg-t900 border-gold-muted/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-success flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Total Income
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-success font-mono">{formatCurrency(activePeriodData.income.total)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
             <div className="text-[10px] text-cream-muted italic">{activePeriodData.label}</div>
          </CardContent>
        </Card>

        <Card className="bg-t900 border-gold-muted/30">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-destructive flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Total Expenses
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive font-mono">{formatCurrency(activePeriodData.expenses.total)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
             <div className="text-[10px] text-cream-muted italic">{activePeriodData.label}</div>
          </CardContent>
        </Card>

        <Card className={cn("bg-t900 border-gold-muted/30", activePeriodData.netProfit >= 0 ? "border-success/30" : "border-destructive/30")}>
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-cream-muted flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Net Yield
            </CardDescription>
            <CardTitle className={cn("text-2xl font-bold font-mono", activePeriodData.netProfit >= 0 ? "text-success" : "text-destructive")}>
                {formatProfitLoss(activePeriodData.netProfit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
             <Badge variant={activePeriodData.netProfit >= 0 ? "default" : "destructive"} className="text-[8px] h-4 uppercase">
                {activePeriodData.netProfit >= 0 ? "Profit" : "Loss"}
             </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <Card className="bg-t900/50 border-gold-muted/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" /> Revenue Streams
            </CardTitle>
            <CardDescription>Income breakdown for {activePeriodData.label}</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeBreakdown.length === 0 ? (
                <div className="py-8 text-center text-cream-muted italic text-sm">No revenue recorded for this period.</div>
            ) : (
                <div className="space-y-3">
                {incomeBreakdown.map((item) => (
                    <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-cream-muted">{item.label}</span>
                            <span className="font-mono text-success">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-t800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-success opacity-80" 
                                style={{ width: `${(item.amount / activePeriodData.income.total) * 100}%` }} 
                            />
                        </div>
                    </div>
                ))}
                </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="bg-t900/50 border-gold-muted/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-destructive" /> Operating Costs
            </CardTitle>
            <CardDescription>Expense breakdown for {activePeriodData.label}</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseBreakdown.length === 0 ? (
                <div className="py-8 text-center text-cream-muted italic text-sm">No expenses recorded for this period.</div>
            ) : (
                <div className="space-y-3">
                {expenseBreakdown.map((item) => (
                    <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-cream-muted">{item.label}</span>
                            <span className="font-mono text-destructive">{formatCurrency(item.amount)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-t800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-destructive opacity-80" 
                                style={{ width: `${(item.amount / activePeriodData.expenses.total) * 100}%` }} 
                            />
                        </div>
                    </div>
                ))}
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Ledger */}
      <Card className="bg-t900 border-gold-muted/20">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-gold-muted" /> Transaction Ledger
            </CardTitle>
            <CardDescription>Detailed history of recent cash movements</CardDescription>
          </div>
          <Badge variant="outline" className="text-cream-muted font-mono">{transactions.length} Records</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="text-[10px] uppercase text-gold-muted tracking-widest border-b border-gold-muted/10">
                    <tr>
                        <th className="py-3 font-bold">Day</th>
                        <th className="py-3 font-bold">Type</th>
                        <th className="py-3 font-bold">Category</th>
                        <th className="py-3 font-bold">Amount</th>
                        <th className="py-3 font-bold">Description</th>
                    </tr>
                </thead>
                <tbody className="text-xs">
                    {recentTransactions.map((t, idx) => (
                        <tr key={t.id || idx} className="border-b border-gold-muted/5 hover:bg-t800/40 transition-colors">
                            <td className="py-3 font-mono text-cream-muted">D{t.day}</td>
                            <td className="py-3">
                                {t.type === "income" ? 
                                    <ArrowUpRight className="w-4 h-4 text-success" /> : 
                                    <ArrowDownLeft className="w-4 h-4 text-destructive" />
                                }
                            </td>
                            <td className="py-3">
                                <Badge variant="outline" className="text-[10px] font-medium border-gold-muted/20 text-cream-muted whitespace-nowrap">
                                    {formatTransactionSubcategory(t.subcategory)}
                                </Badge>
                            </td>
                            <td className={cn("py-3 font-bold font-mono", t.type === "income" ? "text-success" : "text-destructive")}>
                                {formatProfitLoss(t.amount)}
                            </td>
                            <td className="py-3 text-cream-muted max-w-xs truncate">{t.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
          {transactions.length > 50 && (
              <p className="text-[10px] text-center text-cream-muted mt-4 italic">Showing last 50 transactions.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
