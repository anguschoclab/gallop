/**
 * useLedgerTransactions.ts - Hook for financial report ledger data
 *
 * Extracted from FinancialReport.tsx to keep UI components focused on rendering.
 *
 * Dependencies: @/game/store (useGame, useTransactions), @/core/financial/reportBuilder
 */

import { useMemo, useState } from "react";
import { useGame } from "@/game/store";
import { useTransactions } from "@/hooks/game/useCoreState";
import { buildProfitLossReport } from "@/core/financial/reportBuilder";

export type PeriodKey = "week" | "month" | "year" | "allTime";

export interface LedgerTransaction {
  label: string;
  amount: number;
}

export interface LedgerData {
  transactions: ReturnType<typeof useTransactions>;
  cash: number;
  day: number;
  selectedPeriod: PeriodKey;
  setSelectedPeriod: (p: PeriodKey) => void;
  incomeBreakdown: LedgerTransaction[];
  expenseBreakdown: LedgerTransaction[];
  recentTransactions: ReturnType<typeof useTransactions>;
  activePeriodData: ReturnType<typeof buildProfitLossReport>["currentMonth"];
  report: ReturnType<typeof buildProfitLossReport>;
}

export function useLedgerTransactions(): LedgerData {
  const transactions = useTransactions();
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("month");

  const report = useMemo(
    () => buildProfitLossReport(transactions, day),
    [transactions, day],
  );

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

  const incomeBreakdown = useMemo(
    () =>
      [
        { label: "Prize Money", amount: activePeriodData.income.prizeMoney },
        { label: "Auction Sales", amount: activePeriodData.income.auctionSales },
        { label: "Private Sales", amount: activePeriodData.income.privateSales },
        { label: "Stud Fees", amount: activePeriodData.income.studFees },
        { label: "Claiming Sales", amount: activePeriodData.income.claimingSales },
      ].filter((i) => i.amount > 0),
    [activePeriodData],
  );

  const expenseBreakdown = useMemo(
    () =>
      [
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
      ].filter((e) => e.amount > 0),
    [activePeriodData],
  );

  const recentTransactions = useMemo(
    () => [...transactions].reverse().slice(0, 50),
    [transactions],
  );

  return {
    transactions,
    cash,
    day,
    selectedPeriod,
    setSelectedPeriod,
    incomeBreakdown,
    expenseBreakdown,
    recentTransactions,
    activePeriodData,
    report,
  };
}
