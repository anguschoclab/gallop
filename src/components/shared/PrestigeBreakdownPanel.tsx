import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { PrestigeBadge } from "@/components/shared/PrestigeBadge";
import { formatCurrency } from "@/core/common/formatting";
import {
  housePrestigeMultiplier,
  houseCommissionRate,
  racecoursePrestigeMultiplier,
  getRacecoursePrestigeByName,
  getRacecoursePrestige,
} from "@/core/prestige";
import type { AuctionHouse } from "@/core/prestige";
import { CONSIGNMENT_COMMISSION, FAME_GAIN_G1_WIN } from "@/constants";
import { cn } from "@/lib/cn";

interface MetricRowProps {
  label: string;
  value: string;
  tooltip: string;
}

function MetricRow({ label, value, tooltip }: MetricRowProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-between gap-2 cursor-help">
          <span className="text-cream-muted text-xs">{label}</span>
          <span className="font-mono text-xs font-bold text-cream tabular-nums">{value}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

interface SalePrestigeBreakdownProps {
  house: AuctionHouse;
  variant?: "full" | "compact";
  className?: string;
}

export function SalePrestigeBreakdown({
  house,
  variant = "full",
  className,
}: SalePrestigeBreakdownProps) {
  const reserveMul = housePrestigeMultiplier(house);
  const commissionRate = houseCommissionRate(CONSIGNMENT_COMMISSION, house);
  const sampleBase = 50_000;
  const sampleReserve = Math.round(sampleBase * reserveMul);
  const sampleHammer = 100_000;
  const sampleCommission = Math.round(sampleHammer * commissionRate);
  const sampleNet = sampleHammer - sampleCommission;

  if (variant === "compact") {
    return (
      <TooltipProvider delayDuration={200}>
        <div className={cn("flex flex-wrap items-center gap-3", className)}>
          <PrestigeBadge score={house.prestige} />
          <MetricRow
            label="Reserve"
            value={`${reserveMul.toFixed(2)}×`}
            tooltip={`Multiplier = 1 + ((score − 50) / 50) × 0.25. Score 50 = neutral (1.0×). Applied to NPC consignment reserves when the sale is generated.`}
          />
          <MetricRow
            label="Commission"
            value={`${(commissionRate * 100).toFixed(1)}%`}
            tooltip={`Base commission is ${(CONSIGNMENT_COMMISSION * 100).toFixed(0)}%. ${house.shortName} adds a ${(house.commissionSurcharge * 100).toFixed(1)}% surcharge — premier houses charge more for their bench strength.`}
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn("bg-t700 border-gold-muted/40", className)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <PrestigeBadge score={house.prestige} />
            <span className="text-xs text-cream-muted">{house.name}</span>
          </div>
          <div className="space-y-2">
            <MetricRow
              label="Prestige Score"
              value={`${house.prestige}/100`}
              tooltip="Each auction house has a fixed prestige score reflecting its market position — from Crownhill (94) down to Drover Yard (28)."
            />
            <MetricRow
              label="Reserve Multiplier"
              value={`${reserveMul.toFixed(2)}×`}
              tooltip={`Multiplier = 1 + ((score − 50) / 50) × 0.25. Score 50 = neutral (1.0×). Applied to NPC consignment reserves when the sale is generated. Example: ${formatCurrency(sampleBase)} → ${formatCurrency(sampleReserve)}.`}
            />
            <MetricRow
              label="Commission Rate"
              value={`${(commissionRate * 100).toFixed(1)}%`}
              tooltip={`Base commission is ${(CONSIGNMENT_COMMISSION * 100).toFixed(0)}%. ${house.shortName} adds a ${(house.commissionSurcharge * 100).toFixed(1)}% surcharge — premier houses charge more for their bench strength.`}
            />
          </div>
          <div className="border-t border-white/5 pt-2 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-cream/30">
              Worked Example
            </div>
            <div className="text-xs text-cream-muted font-mono space-y-0.5">
              <div>Reserve: {formatCurrency(sampleBase)} → {formatCurrency(sampleReserve)}</div>
              <div>Hammer: {formatCurrency(sampleHammer)} → Commission {formatCurrency(sampleCommission)} → Net {formatCurrency(sampleNet)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

interface RacePrestigeBreakdownProps {
  trackId?: string;
  trackName?: string;
  variant?: "full" | "compact";
  className?: string;
}

export function RacePrestigeBreakdown({
  trackId,
  trackName,
  variant = "full",
  className,
}: RacePrestigeBreakdownProps) {
  const score = trackId
    ? getRacecoursePrestige(trackId)
    : getRacecoursePrestigeByName(trackName);
  const fameMul = racecoursePrestigeMultiplier(trackId, trackName);
  const sampleBaseFame = FAME_GAIN_G1_WIN;
  const sampleAdjustedFame = Math.max(1, Math.round(sampleBaseFame * fameMul));

  if (variant === "compact") {
    return (
      <TooltipProvider delayDuration={200}>
        <div className={cn("flex flex-wrap items-center gap-3", className)}>
          <PrestigeBadge score={score} />
          <MetricRow
            label="Fame"
            value={`${fameMul.toFixed(2)}×`}
            tooltip={`Multiplier = 1 + ((score − 50) / 50) × 0.2. Score 50 = neutral (1.0×). Applied to fame gains from race results. A G1 win worth ${sampleBaseFame} base fame yields ${sampleAdjustedFame} at this venue.`}
          />
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn("bg-t700 border-gold-muted/40", className)}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <PrestigeBadge score={score} />
            <span className="text-xs text-cream-muted">
              {trackName ?? "Course Prestige"}
            </span>
          </div>
          <div className="space-y-2">
            <MetricRow
              label="Prestige Score"
              value={`${score}/100`}
              tooltip="Derived from graded stakes hosted: G1=100pts, G2=45pts, G3=20pts, plus purse/250k. Log-compressed and normalized to 0–100 with a floor of 14."
            />
            <MetricRow
              label="Fame Multiplier"
              value={`${fameMul.toFixed(2)}×`}
              tooltip={`Multiplier = 1 + ((score − 50) / 50) × 0.2. Score 50 = neutral (1.0×). Applied to fame gains from race results.`}
            />
          </div>
          <div className="border-t border-white/5 pt-2 space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-widest text-cream/30">
              Worked Example
            </div>
            <div className="text-xs text-cream-muted font-mono">
              G1 Win: {sampleBaseFame} base fame → {sampleAdjustedFame} at this venue
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
