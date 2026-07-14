import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useGame } from "@/game/store";
import { formatReputationTier, getReputationTier } from "@/core/reputation";
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

  // Derive tier from the live score so the badge never displays a stale label.
  const tier = getReputationTier(reputation.score);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2" data-testid="reputation-badge">
            <Badge className={cn("text-white", reputationColor(tier))}>
              <Trophy className="h-3 w-3 mr-1" />
              {formatReputationTier(tier)}
            </Badge>
            <span className="text-sm text-cream-muted">{reputation.score} pts</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Manager Reputation</p>
            <p className="text-xs leading-relaxed">
              Your standing in the racing world. Reputation is a 0–1000 score earned by winning
              races (especially graded stakes), breeding top horses, and beating rivals. Poor
              graded-race finishes and rivalry losses reduce it. Higher reputation also makes rival
              stables less likely to poach your jockeys.
            </p>
            <ul className="text-[10px] space-y-0.5 text-cream/80">
              <li>Unknown: 0–149</li>
              <li>Local: 150–299</li>
              <li>Regional: 300–449</li>
              <li>National: 450–599</li>
              <li>International: 600–749</li>
              <li>World Class: 750–899</li>
              <li>Legendary: 900–1000</li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
