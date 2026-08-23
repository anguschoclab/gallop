import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HorsePortrait } from "@/components/horse/HorsePortrait";
import { formatCurrency } from "@/core/common/formatting";
import { netProceeds, commissionAmount } from "@/core/auction/engine";
import { CONSIGNMENT_COMMISSION } from "@/constants";
import type { AuctionLot, Horse, Stable } from "@/game/types";

/**
 * Props for the PlayerConsignmentsPanel component.
 */
interface PlayerConsignmentsPanelProps {
  /** List of auction lots consigned by the player. */
  playerConsignedLots: AuctionLot[];
  /** List of all horses to look up consigned horse data. */
  horses: Horse[];
  /** List of all stables to look up buyer names. */
  stables: Stable[];
}

/**
 * Component to display results for auction lots consigned by the player.
 * Only shown when an auction is resolved.
 *
 * EXTRACTED FROM: src/routes/auction.$saleId.tsx
 */
export function PlayerConsignmentsPanel({
  playerConsignedLots,
  horses,
  stables,
}: PlayerConsignmentsPanelProps) {
  // ⚡ Bolt Optimization:
  // Pre-calculate hash maps for O(1) lookups instead of running O(N) .find() inside the .map() loop.
  // Impact: Reduces rendering complexity of player consignments from O(N^2) to O(N),
  // significantly improving performance when processing large auction datasets.
  const { horseMap, stableMap } = useMemo(() => {
    return {
      horseMap: new Map(horses.map((h) => [h.id, h])),
      stableMap: new Map(stables.map((s) => [s.id, s])),
    };
  }, [horses, stables]);

  if (playerConsignedLots.length === 0) return null;

  const soldLots = playerConsignedLots.filter((l) => !l.passed && l.hammerPrice);
  const totalNet = soldLots.reduce((sum, l) => sum + netProceeds(l.hammerPrice!), 0);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Your Consignments</h2>
        <div className="border-b mt-1" />
      </div>
      {playerConsignedLots.map((lot) => {
        const lotHorse = horseMap.get(lot.horseId);
        const buyer = lot.soldToStableId ? stableMap.get(lot.soldToStableId) : undefined;

        return (
          <Card key={lot.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <HorsePortrait
                  id={lotHorse?.id}
                  coatColor={lotHorse?.coatColor}
                  markings={lotHorse?.markings}
                  gender={lotHorse?.gender}
                  appearance={lotHorse?.appearance}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-cream">{lotHorse?.name ?? "Unknown"}</p>
                      <p className="text-xs text-cream-muted">
                        {lotHorse
                          ? `${lotHorse.gender.charAt(0).toUpperCase() + lotHorse.gender.slice(1)} · Age ${Math.floor(lotHorse.age)}${lotHorse.hemisphere === "Southern" ? " · Southern" : ""}`
                          : ""}
                      </p>
                    </div>
                    {lot.passed ? (
                      <Badge variant="secondary">Passed</Badge>
                    ) : (
                      <Badge className="bg-success text-white">Sold</Badge>
                    )}
                  </div>
                  <div className="border-t mt-2 pt-2 space-y-1 text-sm">
                    {lot.passed || !lot.hammerPrice ? (
                      <p className="text-cream-muted italic">Reserve not met</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-cream-muted">Hammer price</span>
                          <span className="tabular-nums font-medium">
                            {formatCurrency(lot.hammerPrice)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-cream-muted">
                            Commission ({Math.round(CONSIGNMENT_COMMISSION * 100)}%)
                          </span>
                          <span className="tabular-nums text-destructive">
                            −{formatCurrency(commissionAmount(lot.hammerPrice))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-cream-muted">Net proceeds</span>
                          <span className="tabular-nums text-success">
                            {formatCurrency(netProceeds(lot.hammerPrice))}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-cream-muted">Sold to</span>
                      <span className="font-medium">
                        {lot.passed ? "Passed — reserve not met" : buyer ? buyer.name : "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {soldLots.length > 0 && (
        <p className="text-sm text-cream-muted tabular-nums">
          <strong className="text-cream">{soldLots.length}</strong>{" "}
          {soldLots.length === 1 ? "horse" : "horses"} sold · Total net proceeds:{" "}
          <strong className="text-cream">{formatCurrency(totalNet)}</strong> (after{" "}
          {Math.round(CONSIGNMENT_COMMISSION * 100)}% commission)
        </p>
      )}
    </div>
  );
}
