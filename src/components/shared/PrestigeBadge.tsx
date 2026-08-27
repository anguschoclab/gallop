/**
 * PrestigeBadge.tsx - Compact venue prestige indicator
 *
 * Renders a prestige tier label with a 0-100 score, used for auction houses
 * and racecourses.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { getPrestigeTier, PRESTIGE_TIER_LABELS } from "@/core/prestige";

const TIER_CLASSES = {
  world: "bg-gold/20 text-gold border-gold/40",
  premier: "bg-gold/10 text-gold-muted border-gold/25",
  national: "bg-sky-500/10 text-sky-300 border-sky-400/25",
  regional: "bg-slate-500/10 text-cream/60 border-white/15",
  provincial: "bg-slate-700/30 text-cream/40 border-white/10",
} as const;

interface PrestigeBadgeProps {
  score: number;
  label?: string;
  showScore?: boolean;
  className?: string;
}

export function PrestigeBadge({ score, label, showScore = true, className }: PrestigeBadgeProps) {
  const tier = getPrestigeTier(score);
  return (
    <Badge
      variant="outline"
      title={`Prestige ${score}/100 — ${PRESTIGE_TIER_LABELS[tier]}`}
      className={cn(
        "rounded-none border font-mono text-[10px] font-black uppercase tracking-widest px-2 h-5 gap-1.5",
        TIER_CLASSES[tier],
        className,
      )}
    >
      <span>{label ?? PRESTIGE_TIER_LABELS[tier]}</span>
      {showScore && <span className="tabular-nums opacity-70">{score}</span>}
    </Badge>
  );
}
