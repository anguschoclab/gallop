import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Target, Lightbulb, Gauge } from "lucide-react";
import type { StableAIState } from "@/core/ai/npcCycleAI";
import { formatCurrency } from "@/core/common/formatting";

interface AIPersonalityCardProps {
  stableAI: StableAIState;
}

export function AIPersonalityCard({ stableAI }: AIPersonalityCardProps) {
  const p = stableAI.personalityState;
  if (!p) return null;

  const riskTolerance = Math.round((1 - p.conservatism) * 100);

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-purple-400">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40 flex items-center gap-2">
          <Brain className="h-3 w-3 text-purple-400" /> AI Personality Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="px-3 py-1 border-purple-400/30 text-purple-300 rounded-none font-mono text-[10px] uppercase"
          >
            {p.personality.replace(/-/g, " ")}
          </Badge>
          <Badge
            variant="outline"
            className="px-2 py-1 border-white/10 text-cream/60 rounded-none font-mono text-[9px] uppercase"
          >
            {p.currentStrategy.replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatRow
            icon={<Gauge className="h-3 w-3 text-blue-400" />}
            label="Risk Tolerance"
            value={`${riskTolerance}%`}
          />
          <StatRow
            icon={<TrendingUp className="h-3 w-3 text-green-400" />}
            label="Learning Rate"
            value={p.learningRate.toFixed(2)}
          />
          <StatRow
            icon={<Target className="h-3 w-3 text-orange-400" />}
            label="Strategic Horizon"
            value={p.strategicHorizon.toFixed(2)}
          />
          <StatRow
            icon={<Lightbulb className="h-3 w-3 text-yellow-400" />}
            label="Innovation"
            value={p.innovation.toFixed(2)}
          />
        </div>

        <div className="space-y-1 pt-2 border-t border-white/5">
          <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-cream/30">
            <span>Strategy Confidence</span>
            <span className="text-cream/60">{Math.round(p.strategyConfidence * 100)}%</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-400/60 transition-all"
              style={{ width: `${p.strategyConfidence * 100}%` }}
            />
          </div>
        </div>

        {stableAI.budgetAllocation && <BudgetAllocationView budget={stableAI.budgetAllocation} />}
      </CardContent>
    </Card>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-black/20 p-2 border border-white/5">
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-cream/30">
        {icon} {label}
      </span>
      <span className="font-mono text-xs text-cream tabular-nums">{value}</span>
    </div>
  );
}

function BudgetAllocationView({
  budget,
}: {
  budget: NonNullable<StableAIState["budgetAllocation"]>;
}) {
  const categories: Array<{ key: keyof typeof budget; label: string; color: string }> = [
    { key: "training", label: "Training", color: "bg-blue-400" },
    { key: "facilities", label: "Facilities", color: "bg-green-400" },
    { key: "auctions", label: "Auctions", color: "bg-gold" },
    { key: "claiming", label: "Claiming", color: "bg-orange-400" },
    { key: "breeding", label: "Breeding", color: "bg-pink-400" },
  ];

  return (
    <div className="space-y-2 pt-2 border-t border-white/5">
      <div className="text-[9px] font-black uppercase tracking-widest text-cream/30">
        Budget Allocation
      </div>
      <div className="text-xs font-mono text-cream/60">Total: {formatCurrency(budget.total)}</div>
      <div className="flex h-2 rounded-full overflow-hidden bg-black/40">
        {categories.map((cat) => {
          const pct = budget.total > 0 ? (budget[cat.key] as number) / budget.total : 0;
          return pct > 0 ? (
            <div
              key={cat.key}
              className={cat.color}
              style={{ width: `${pct * 100}%` }}
              title={`${cat.label}: ${formatCurrency(budget[cat.key] as number)}`}
            />
          ) : null;
        })}
      </div>
      <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1 text-cream/40">
            <div className={`w-2 h-2 ${cat.color} rounded-sm`} />
            {cat.label}: {formatCurrency(budget[cat.key] as number)}
          </div>
        ))}
      </div>
    </div>
  );
}
