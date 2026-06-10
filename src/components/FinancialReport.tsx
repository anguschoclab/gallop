import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLedgerTransactions, type PeriodKey } from "@/hooks/useLedgerTransactions";
import { NumericValue } from "@/components/horse/HorseBits";
import { FinancialChart } from "@/components/FinancialChart";
import { FinancialSummaryCards } from "@/components/financial/FinancialSummaryCards";
import { RevenueAnalysisPanel } from "@/components/financial/RevenueAnalysisPanel";
import { OperatingCostsPanel } from "@/components/financial/OperatingCostsPanel";
import { TransactionLedger } from "@/components/financial/TransactionLedger";
import { BarChart3 } from "lucide-react";

export function FinancialReport() {
  const {
    transactions,
    cash,
    day,
    selectedPeriod,
    setSelectedPeriod,
    incomeBreakdown,
    expenseBreakdown,
    recentTransactions,
    activePeriodData,
  } = useLedgerTransactions();

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
            <span>Audit Day: <NumericValue value={day} /></span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Entries: <NumericValue value={transactions.length} /></span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Status: <span className="text-success font-black">Healthy</span></span>
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

      <FinancialSummaryCards cash={cash} periodData={activePeriodData} />

      <section className="pt-4">
        <FinancialChart transactions={transactions} day={day} period={selectedPeriod} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <RevenueAnalysisPanel items={incomeBreakdown} total={activePeriodData.income.total} />
        <OperatingCostsPanel items={expenseBreakdown} total={activePeriodData.expenses.total} />
      </div>

      <TransactionLedger transactions={transactions} recentTransactions={recentTransactions} />
    </div>
  );
}
