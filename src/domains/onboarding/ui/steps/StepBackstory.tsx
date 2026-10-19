import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { formatCurrency } from "@/shared/common/formatting";
import { BACKSTORIES } from "@/shared/common/backstories";
import type { BackstoryId } from "@/platform/game/types";
import {
  TOTAL_HORSES,
  FACILITY_UPGRADE_COUNT,
} from "@/domains/onboarding/application/steps/helpers";

interface StepBackstoryProps {
  backstoryId: BackstoryId | undefined;
  setBackstoryId: (id: BackstoryId) => void;
}

export function StepBackstory({ backstoryId, setBackstoryId }: StepBackstoryProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {BACKSTORIES.map((b) => {
        const selected = b.id === backstoryId;
        return (
          <Tooltip key={b.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setBackstoryId(b.id)}
                className={`text-left rounded-lg border-2 p-4 transition-all ${
                  selected
                    ? "border-primary bg-card/60"
                    : "border-muted bg-surface/40 hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-[family-name:var(--font-display)] text-lg text-foreground">
                    {b.label}
                  </h3>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {b.difficulty.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{b.blurb}</p>
                <dl className="mt-3 grid grid-cols-2 gap-1 text-xs text-foreground tabular-nums">
                  <dt className="text-muted-foreground">Cash</dt>
                  <dd>{formatCurrency(b.startingCash)}</dd>
                  <dt className="text-muted-foreground">Horses</dt>
                  <dd>{TOTAL_HORSES(b)}</dd>
                  <dt className="text-muted-foreground">Upgraded facilities</dt>
                  <dd>{FACILITY_UPGRADE_COUNT(b)}</dd>
                  <dt className="text-muted-foreground">Reputation</dt>
                  <dd>{b.reputationScore}</dd>
                </dl>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {b.difficulty.replace("_", " ")} • starts at reputation {b.reputationScore}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
