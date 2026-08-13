import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { NumericValue } from "@/components/horse/HorseBits";
import { cn } from "@/lib/cn";
import { useSeasonPlanner } from "@/hooks/breeding/useSeasonPlanner";
import { MarePlannerRow } from "@/components/breeding/MarePlannerRow";
import { PlanSummaryBar } from "@/components/breeding/PlanSummaryBar";

export function SeasonPlannerTab() {
  const planner = useSeasonPlanner();
  const {
    eligibleMares,
    availableStallions,
    savedMatingPlans,
    assignments,
    assignedCount,
    totalCost,
    canAffordAll,
    seasonOpen,
    nextSeasonStart,
    day,
    cash,
    suggestionsForMare,
    setSireForMare,
    setLFGForMare,
    clearMare,
    clearAll,
    autoAssign,
    confirmAll,
    savePlan,
    loadPlan,
    deletePlan,
    calculateFee,
  } = planner;

  const sortedMares = useMemo(
    () => [...eligibleMares].sort((a, b) => a.name.localeCompare(b.name)),
    [eligibleMares],
  );

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight font-[family-name:var(--font-display)] text-cream">
            Season Planner
          </h2>
          <p className="text-sm text-cream-muted">
            Assign sires to all eligible mares at once, save plans, and confirm in a single action.
          </p>
        </div>
        <Badge
          className={cn(
            "font-[family-name:var(--font-mono)] tabular-nums",
            seasonOpen ? "bg-success text-t950" : "bg-t700 text-cream",
          )}
        >
          <Calendar className="h-3 w-3 mr-1" />
          {seasonOpen ? (
            "Season Open"
          ) : (
            <>
              Opens Day <NumericValue value={nextSeasonStart} />
            </>
          )}
        </Badge>
      </div>

      {sortedMares.length === 0 ? (
        <Card className="border-gold-muted">
          <CardContent className="py-12 text-center">
            <p className="text-cream-muted">
              No eligible mares. Retire mares from racing or wait for foals to mature.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gold-muted">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 py-2 px-4 border-b border-gold-muted/30 text-xs font-semibold text-cream-muted uppercase tracking-wider">
              <div className="flex-1">Mare</div>
              <div className="min-w-[200px]">Sire</div>
              <div className="w-[80px]">LFG</div>
              <div className="w-[90px] text-right">Fee</div>
              <div className="w-[100px] text-right">Actions</div>
            </div>
            {sortedMares.map((mare) => (
              <MarePlannerRow
                key={mare.id}
                mare={mare}
                assignment={assignments[mare.id]}
                suggestions={suggestionsForMare(mare.id)}
                stallions={availableStallions}
                onSireChange={setSireForMare}
                onLFGChange={setLFGForMare}
                onSuggest={(damId) => {
                  const suggestions = suggestionsForMare(damId);
                  if (suggestions[0]) {
                    setSireForMare(damId, suggestions[0].stallion.id);
                  }
                }}
                onClear={clearMare}
                calculateFee={calculateFee}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <PlanSummaryBar
        assignedCount={assignedCount}
        totalCost={totalCost}
        cash={cash}
        canAffordAll={canAffordAll}
        seasonOpen={seasonOpen}
        savedMatingPlans={savedMatingPlans}
        onConfirmAll={confirmAll}
        onAutoAssign={autoAssign}
        onClearAll={clearAll}
        onSavePlan={savePlan}
        onLoadPlan={loadPlan}
        onDeletePlan={deletePlan}
      />
    </div>
  );
}
