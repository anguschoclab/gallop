// Consign-horse dialog with reserve slider and live commission preview.
//
// UX goal: a player should *understand* what they're agreeing to before
// they consign. This dialog surfaces the 6% sale-house commission, lets
// them choose a reserve between 50% and 100% of estimated value, and
// shows them what they'll net at reserve and at a "good outcome"
// (reserve + 50%).

import { useMemo, useState } from "react";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { netProceeds } from "@/core/auction/engine";
import { CONSIGNMENT_COMMISSION, DEFAULT_PLAYER_RESERVE_RATIO } from "@/constants";
import { KIND_LABELS } from "@/core/auction/data";
import { formatCurrency } from "@/core/common/formatting";
import { horseMarketValue } from "@/core/horse/pricing";
import type { Horse, AuctionSale } from "@/game/types";

type Props = {
  horse: Horse;
  sale: AuctionSale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConsignDialog({ horse, sale, open, onOpenChange }: Props) {
  const horses = useGameWithShallow((s) => s.horses);
  const consignHorse = useGame((s) => s.consignHorse);

  const baseValue = useMemo(() => horseMarketValue(horse, horses), [horse, horses]);
  // Slider is a percentage of base value (50–100%), default 70%.
  const [reservePct, setReservePct] = useState(Math.round(DEFAULT_PLAYER_RESERVE_RATIO * 100));
  const reservePrice = Math.round(baseValue * (reservePct / 100));
  const netAtReserve = netProceeds(reservePrice);
  const netAtUpside = netProceeds(Math.round(reservePrice * 1.5));
  const commissionAtReserve = reservePrice - netAtReserve;

  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const result = consignHorse(horse.id, sale.id, reservePrice);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Consign {horse.name}</DialogTitle>
          <DialogDescription>
            {sale.name} · <Badge variant="outline">{KIND_LABELS[sale.kind] ?? sale.kind}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Estimated value */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Estimated value</span>
              <span className="font-medium tabular-nums">{formatCurrency(baseValue)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on stats, age, and pedigree. The market may pay above or below.
            </p>
          </div>

          {/* Reserve slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Reserve price</label>
              <span className="text-sm tabular-nums font-semibold">
                {formatCurrency(reservePrice)}{" "}
                <span className="text-muted-foreground font-normal">({reservePct}%)</span>
              </span>
            </div>
            <Slider
              min={50}
              max={100}
              step={5}
              value={[reservePct]}
              onValueChange={(v) => setReservePct(v[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50% · easy sale</span>
              <span>100% · holds out</span>
            </div>
          </div>

          {/* Commission disclosure */}
          <div className="rounded-lg border-l-4 border-l-warning bg-warning/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Sale-house commission</span>
              <span className="tabular-nums">{Math.round(CONSIGNMENT_COMMISSION * 100)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Commission at reserve</span>
              <span className="tabular-nums">{formatCurrency(commissionAtReserve)}</span>
            </div>
            <div className="border-t pt-1.5 mt-1.5 space-y-0.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net if sold at reserve</span>
                <span className="font-semibold tabular-nums">{formatCurrency(netAtReserve)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Net at strong outcome (reserve × 1.5)</span>
                <span className="tabular-nums">{formatCurrency(netAtUpside)}</span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Consign to {sale.name.split(" ").slice(0, 2).join(" ")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
