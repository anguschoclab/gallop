import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/formatting";
import type { JockeySilk } from "@/game/types";
import type { Backstory } from "@/core/newGame/backstories";
import { SilkPreview } from "../SilkPreview";

interface StepReviewProps {
  stableName: string;
  ownerName: string;
  silk: JockeySilk;
  backstory: Backstory;
}

export function StepReview({ stableName, ownerName, silk, backstory }: StepReviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[140px_1fr]">
      <SilkPreview silk={silk} size={120} />
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-[family-name:var(--font-display)] text-cream">
            {stableName}
          </h3>
          <p className="text-sm text-cream-muted">Owner: {ownerName}</p>
        </div>
        <div>
          <p className="text-sm text-cream font-medium">{backstory.label}</p>
          <p className="text-sm text-cream-muted">{backstory.blurb}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums">
          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-cream-muted cursor-help">Starting cash</dt>
            </TooltipTrigger>
            <TooltipContent>
              Operating capital. You'll spend this on training, entries, and horses.
            </TooltipContent>
          </Tooltip>
          <dd className="text-cream">{formatCurrency(backstory.startingCash)}</dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-cream-muted cursor-help">Starting horses</dt>
            </TooltipTrigger>
            <TooltipContent>
              Generated from your stable seed; pedigree and stats will be unique.
            </TooltipContent>
          </Tooltip>
          <dd className="text-cream">
            {backstory.horses.map((h) => `${h.count}× ${h.tier}`).join(", ")}
          </dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-cream-muted cursor-help">Facility upgrades</dt>
            </TooltipTrigger>
            <TooltipContent>
              You always start with all facilities at "basic"; these are upgrades on top.
            </TooltipContent>
          </Tooltip>
          <dd className="text-cream">
            {Object.entries(backstory.facilityUpgrades).length === 0
              ? "—"
              : Object.entries(backstory.facilityUpgrades)
                  .map(([type, level]) => `${type.replace("_", " ")} (${level})`)
                  .join(", ")}
          </dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-cream-muted cursor-help">Reputation</dt>
            </TooltipTrigger>
            <TooltipContent>
              0–1000 score. Affects scouting access and future race invitations.
            </TooltipContent>
          </Tooltip>
          <dd className="text-cream">{backstory.reputationScore}</dd>
        </dl>
      </div>
    </div>
  );
}
