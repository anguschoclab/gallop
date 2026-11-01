/**
 * RivalStakeDialog.tsx — Buy or sell a stake in a rival stable's racehorse.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useGame } from "@/platform/game/store";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Slider } from "@/shared/ui/slider";
import { formatCurrency } from "@/shared/common/formatting";
import {
  MAX_RIVAL_STAKE_PERCENT,
  splitStakePrize,
  stakeBuyPricePerPercent,
  stakeResultReputation,
  stakeSellPricePerPercent,
} from "@/domains/syndicates/model/rivalStakes";
import { calculateRaceWinReputation } from "@/domains/reputation/model/reputationTypes";

export interface RivalStakeTarget {
  horseId: string;
  horseName: string;
  ownerName: string;
  horseValue: number;
  heldPercent: number;
}

interface Props {
  target: RivalStakeTarget | null;
  mode: "buy" | "sell";
  onClose: () => void;
}

/** Example purse used to illustrate the prize split. */
const EXAMPLE_PURSE = 100_000;

export function RivalStakeDialog({ target, mode, onClose }: Props) {
  const cash = useGame((s) => s.cash);
  const buyRivalStake = useGame((s) => s.buyRivalStake);
  const sellRivalStake = useGame((s) => s.sellRivalStake);

  const max =
    mode === "buy" ? Math.max(0, MAX_RIVAL_STAKE_PERCENT - (target?.heldPercent ?? 0)) : (target?.heldPercent ?? 0);
  const [percent, setPercent] = useState(1);
  useEffect(() => {
    setPercent(mode === "buy" ? Math.min(10, Math.max(1, max)) : Math.max(1, max));
  }, [target?.horseId, mode, max]);

  if (!target) return null;

  const unit =
    mode === "buy" ? stakeBuyPricePerPercent(target.horseValue) : stakeSellPricePerPercent(target.horseValue);
  const total = unit * percent;
  const after = mode === "buy" ? target.heldPercent + percent : target.heldPercent - percent;
  const winShare = splitStakePrize(EXAMPLE_PURSE * 0.6, after).playerShare;
  const g1Rep = stakeResultReputation(calculateRaceWinReputation("G1", 1_000_000), after, 1, true);
  const tooExpensive = mode === "buy" && total > cash;

  const submit = () => {
    const result = mode === "buy" ? buyRivalStake(target.horseId, percent) : sellRivalStake(target.horseId, percent);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success(
      mode === "buy"
        ? `Bought ${percent}% of ${target.horseName} for ${formatCurrency(result.amount)}`
        : `Sold ${percent}% of ${target.horseName} for ${formatCurrency(result.amount)}`,
    );
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "buy" ? "Buy a stake in" : "Sell your stake in"} {target.horseName}
          </DialogTitle>
          <DialogDescription>
            Owned by {target.ownerName} · market value {formatCurrency(target.horseValue)}
            {target.heldPercent > 0 ? ` · you hold ${target.heldPercent}%` : ""}
          </DialogDescription>
        </DialogHeader>

        {max <= 0 ? (
          <p className="text-sm text-muted-foreground">
            The owner keeps control — you already hold the most they will sell ({MAX_RIVAL_STAKE_PERCENT}%).
          </p>
        ) : (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Stake</span>
                <span className="text-2xl font-bold tabular-nums text-foreground">{percent}%</span>
              </div>
              <Slider
                aria-label="Stake percentage"
                min={1}
                max={max}
                step={1}
                value={[Math.min(percent, max)]}
                onValueChange={([v]) => setPercent(v)}
              />
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>1%</span>
                <span>{max}%</span>
              </div>
            </div>

            <dl className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <Row label={mode === "buy" ? "Price per 1% (owner premium)" : "Buy-back per 1%"} value={formatCurrency(unit)} />
              <Row
                label={mode === "buy" ? "Total cost" : "You receive"}
                value={formatCurrency(total)}
                strong
                tone={tooExpensive ? "danger" : undefined}
              />
              <Row label="Your stake afterwards" value={`${after}%`} />
              <Row label="Your share of a $60,000 winner's prize" value={formatCurrency(winShare)} />
              <Row label="Prestige from a G1 win" value={`+${g1Rep}`} />
            </dl>
            {tooExpensive && (
              <p className="text-xs text-destructive">You have {formatCurrency(cash)} — not enough for this stake.</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={max <= 0 || tooExpensive}>
            {mode === "buy" ? `Buy ${percent}%` : `Sell ${percent}%`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "danger" }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`tabular-nums ${strong ? "font-bold" : ""} ${tone === "danger" ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}
