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
    unknown: "bg-gray-500",
    local: "bg-blue-500",
    regional: "bg-green-500",
    national: "bg-purple-500",
    international: "bg-orange-500",
    world_class: "bg-pink-500",
    legendary: "bg-amber-500",
  };

  const tierColor = tierColors[reputation.tier] ?? "bg-gray-500";

  return (
    <div className="flex items-center gap-2">
      <Badge className={tierColor}>
        <Trophy className="h-3 w-3 mr-1" />
        {formatReputationTier(reputation.tier)}
      </Badge>
      <span className="text-sm text-muted-foreground">{reputation.score} pts</span>
    </div>
  );
}
