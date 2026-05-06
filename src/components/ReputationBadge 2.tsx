import { Badge } from "@/components/ui/badge";
import { useGame } from "@/game/store";
import { formatReputationTier } from "@/core/reputation";
import { Trophy } from "lucide-react";

/**
 * Reputation Badge Component
 * Displays the manager's current reputation tier and score
 */
export function ReputationBadge() {
  const reputation = useGame((s) => s.reputation);

  if (!reputation) {
    return null;
  }

  const tierColors: Record<string, string> = {
    unknown: "bg-t600",
    local: "bg-info",
    regional: "bg-success",
    national: "bg-chart-4",
    international: "bg-warning",
    world_class: "bg-fame",
    legendary: "bg-gold",
  };

  const tierColor = tierColors[reputation.tier] ?? "bg-t600";

  return (
    <div className="flex items-center gap-2">
      <Badge className={tierColor}>
        <Trophy className="h-3 w-3 mr-1" />
        {formatReputationTier(reputation.tier)}
      </Badge>
      <span className="text-sm text-cream-muted">{reputation.score} pts</span>
    </div>
  );
}
