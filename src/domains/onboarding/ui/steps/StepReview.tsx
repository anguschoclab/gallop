import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { formatCurrency } from "@/shared/common/formatting";
import {
  facilityLevelToTierLabel,
  FACILITY_NAMES,
  type FacilityLevel,
  type FacilityType,
} from "@/domains/facilities/application/facilitiesFacade";
import type { JockeySilk } from "@/platform/game/types";
import type { Backstory } from "@/shared/common/backstories";
import type { WorldSize } from "@/domains/stable/application/stableFacade";
import { WORLD_SIZE_CONFIGS } from "@/domains/stable/application/stableFacade";
import { SilkPreview } from "@/domains/onboarding/ui/SilkPreview";

interface StepReviewProps {
  stableName: string;
  ownerName: string;
  silk: JockeySilk;
  backstory: Backstory;
  worldSize: WorldSize;
}

export function StepReview({ stableName, ownerName, silk, backstory, worldSize }: StepReviewProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[140px_1fr]">
      <SilkPreview silk={silk} size={120} />
      <div className="space-y-4">
        <div>
          <h3 className="text-2xl font-[family-name:var(--font-display)] text-foreground">
            {stableName}
          </h3>
          <p className="text-sm text-muted-foreground">Owner: {ownerName}</p>
        </div>
        <div>
          <p className="text-sm text-foreground font-medium">{backstory.label}</p>
          <p className="text-sm text-muted-foreground">{backstory.blurb}</p>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm tabular-nums">
          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-muted-foreground cursor-help">Starting cash</dt>
            </TooltipTrigger>
            <TooltipContent>
              Operating capital. You'll spend this on training, entries, and horses.
            </TooltipContent>
          </Tooltip>
          <dd className="text-foreground">{formatCurrency(backstory.startingCash)}</dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-muted-foreground cursor-help">Starting horses</dt>
            </TooltipTrigger>
            <TooltipContent>
              Generated from your stable seed; pedigree and stats will be unique.
            </TooltipContent>
          </Tooltip>
          <dd className="text-foreground">
            {backstory.horses.map((h) => `${h.count}× ${h.tier}`).join(", ")}
          </dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-muted-foreground cursor-help">Facility upgrades</dt>
            </TooltipTrigger>
            <TooltipContent>
              You always start with all facilities at Tier 01; these are upgrades on top.
            </TooltipContent>
          </Tooltip>
          <dd className="text-foreground">
            {Object.entries(backstory.facilityUpgrades).length === 0
              ? "—"
              : Object.entries(backstory.facilityUpgrades)
                  .map(
                    ([type, level]) =>
                      `${FACILITY_NAMES[type as FacilityType] ?? type} (${facilityLevelToTierLabel(level as FacilityLevel)})`,
                  )
                  .join(", ")}
          </dd>

          <Tooltip>
            <TooltipTrigger asChild>
              <dt className="text-muted-foreground cursor-help">Reputation</dt>
            </TooltipTrigger>
            <TooltipContent>
              Initial industry reputation (0–1000). Grows with wins, graded stakes, breeding
              success, and rivalry victories; used to resist rival jockey poaching.
            </TooltipContent>
          </Tooltip>
          <dd className="text-foreground">{backstory.reputationScore}</dd>

          <dt className="text-muted-foreground">World size</dt>
          <dd className="text-foreground">
            {worldSize.charAt(0).toUpperCase() + worldSize.slice(1)} (
            {WORLD_SIZE_CONFIGS[worldSize].stables.elite.count +
              WORLD_SIZE_CONFIGS[worldSize].stables.mid.count +
              WORLD_SIZE_CONFIGS[worldSize].stables.budget.count +
              WORLD_SIZE_CONFIGS[worldSize].stables.filler.count}{" "}
            stables)
          </dd>
        </dl>
      </div>
    </div>
  );
}
