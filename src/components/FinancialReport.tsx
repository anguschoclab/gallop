import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { useGame } from "@/game/store";
import { formatCurrency, formatProfitLoss } from "@/core/financial";
import type { IncomeSummary, ExpenseSummary } from "@/core/financial";

/**
 * Simple Financial Report Component
 * Displays current cash position and basic income/expense breakdown
 * from race history and known expenses.
 */
export function FinancialReport() {
  const { horses, races, cash, day } = useGame((state) => ({
    horses: state.horses,
    races: state.races,
    cash: state.cash,
    day: state.day,
  }));

  // Calculate income from resolved races
  const playerHorses = horses.filter((h) => h.owned);
  const playerHorseIds = new Set(playerHorses.map((h) => h.id));

  // Calculate prize money from race history
  let totalPrizeMoney = 0;
  const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];

  for (const race of races) {
    if (!race.resolved || !race.result) continue;

    for (const result of race.result) {
      if (playerHorseIds.has(result.horseId)) {
        const position = result.position;
        if (position <= PRIZE_SPLIT.length) {
          totalPrizeMoney += Math.round(race.purse * PRIZE_SPLIT[position - 1]);
        }
      }
    }
  }

  // Calculate expenses (estimated)
  const daysActive = Math.max(1, day);
  const upkeepPerHorse = 50;
  const trainingCost = 75;

  // Estimate training sessions (2 per day per horse, but not all horses train daily)
  const estimatedTrainingSessions = playerHorses.length * daysActive * 1.5; // ~1.5 sessions per horse per day
  const estimatedUpkeep = playerHorses.length * upkeepPerHorse * daysActive;
  const estimatedTraining = estimatedTrainingSessions * trainingCost;

  // Entry fees from races entered
  let totalEntryFees = 0;
  for (const race of races) {
    for (const entry of race.entries) {
      if (playerHorseIds.has(entry.horseId)) {
        totalEntryFees += race.entryFee;
      }
    }
  }

  const income: IncomeSummary = {
    prizeMoney: totalPrizeMoney,
    claimingSales: 0, // Would need claiming history
    auctionSales: 0,  // Would need auction history
    privateSales: 0,  // Would need sales tracking
    studFees: 0,      // Would need stud activity
    total: totalPrizeMoney,
  };

  const expenses: ExpenseSummary = {
    upkeep: estimatedUpkeep,
    training: estimatedTraining,
    entryFees: totalEntryFees,
    jockeyFees: 0,    // Would need jockey fee tracking
    horsePurchases: 0, // Would need purchase history
    breedingFees: 0,  // Would need breeding tracking
    transport: 0,     // Not implemented yet
    veterinary: 0,    // Not implemented yet
    farrier: 0,       // Not implemented yet
    insurance: 0,     // Not implemented yet
    facilityMaintenance: daysActive * 100, // Rough estimate
    total: estimatedUpkeep + estimatedTraining + totalEntryFees + daysActive * 100,
  };

  const netProfit = income.total - expenses.total;

  return (
    <div className="space-y-4">
      {/* Cash Position */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Current Cash Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Wallet className="h-8 w-8 text-emerald-600" />
            <div>
              <div className="text-3xl font-bold">{formatCurrency(cash)}</div>
              <p className="text-xs text-muted-foreground">
                Day {day} of operations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* P&L Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(income.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              Prize money from {races.filter((r) => r.resolved).length} resolved races
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(expenses.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              Upkeep, training, entry fees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Net Profit/Loss
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netProfit >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {formatProfitLoss(netProfit)}
            </div>
            <Badge variant={netProfit >= 0 ? "default" : "destructive"} className="mt-1">
              {netProfit >= 0 ? "Profitable" : "Operating at Loss"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Daily Upkeep</span>
              <span>{formatCurrency(expenses.upkeep)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Training Costs</span>
              <span>{formatCurrency(expenses.training)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Race Entry Fees</span>
              <span>{formatCurrency(expenses.entryFees)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Facility Maintenance</span>
              <span>{formatCurrency(expenses.facilityMaintenance)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total Expenses</span>
                <span>{formatCurrency(expenses.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note about future expansion */}
      <p className="text-xs text-muted-foreground text-center">
        Detailed transaction history and expense categories coming in a future update.
      </p>
    </div>
  );
}
