import { Badge } from "@/components/ui/badge";
import { useGame } from "@/game/store";
import { formatReputationTier } from "@/core/reputation";
import { reputationColor } from "@/core/common/uiTokens";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Reputation Badge Component
 * Displays the manager's current reputation tier and score
 */
export function ReputationBadge() {
  const reputation = useGame((s) => s.reputation);

  if (!reputation) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={cn("text-white", reputationColor(reputation.tier))}>
        <Trophy className="h-3 w-3 mr-1" />
        {formatReputationTier(reputation.tier)}
      </Badge>
      <span className="text-sm text-cream-muted">{reputation.score} pts</span>
    </div>
  );
}
