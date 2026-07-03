import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/core/common/formatting";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { Race, Horse, Claim } from "@/game/types";

/**
 * Props for the ClaimingRacePanel component.
 */
interface ClaimingRacePanelProps {
  /** The claiming race being viewed. */
  race: Race;
  /** List of all horses to look up entry names. */
  horses: Horse[];
  /** List of all claims to check for existing player claims. */
  claims: Claim[];
  /** Player's current cash balance. */
  cash: number;
  /** Callback function to file a claim. */
  fileClaim: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
}

/**
 * Component to display claiming race entries and handle claim filing.
 *
 * EXTRACTED FROM: src/routes/races.tsx
 */
export function ClaimingRacePanel({
  race,
  horses,
  claims,
  cash,
  fileClaim,
}: ClaimingRacePanelProps) {
  const [pendingClaimHorseId, setPendingClaimHorseId] = useState<string | null>(null);

  if (!race.claiming) return null;

  const price = race.claiming.price;
  // Pre-calculate hash map for O(1) horse lookups instead of running O(N) .find() inside the map loops.
  const horseMap = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);

  const pendingHorse = pendingClaimHorseId ? horseMap.get(pendingClaimHorseId) : null;

  return (
    <>
      <div className="ml-4 mt-1 mb-1 p-3 rounded-b-lg border border-t-0 border-gold-muted/50 bg-t900 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-warning flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Claiming Race Entries — {formatCurrency(price)}
        </p>
        <div className="space-y-1">
          {race.entries.map((entry) => {
            const entryHorse = horseMap.get(entry.horseId);
            const isOwned = !!entry.owned;
            const playerClaimFiled = claims.some(
              (c) =>
                c.raceId === race.id &&
                c.horseId === entry.horseId &&
                c.claimantStableId === undefined,
            );
            const canAfford = cash >= price;

            return (
              <div
                key={entry.horseId}
                className="flex items-center justify-between py-1 border-b border-gold-muted/20 last:border-0"
              >
                <Link
                  to="/stable/$horseId"
                  params={{ horseId: entry.horseId }}
                  className="text-sm text-cream font-medium hover:underline hover:text-gold"
                >
                  {entryHorse?.name ?? entry.horseId}
                  {isOwned && <span className="ml-2 text-xs text-success">(your horse)</span>}
                </Link>
                <div>
                  {!isOwned &&
                    (playerClaimFiled ? (
                      <Button size="sm" variant="ghost" disabled className="text-xs">
                        Claim filed
                      </Button>
                    ) : (
                      canAfford ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setPendingClaimHorseId(entry.horseId)}
                        >
                          Claim {formatCurrency(price)}
                        </Button>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0} className="inline-block cursor-not-allowed">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled
                                  className="text-xs pointer-events-none"
                                >
                                  Claim {formatCurrency(price)}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>You need {formatCurrency(price - cash)} to file this claim.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {pendingClaimHorseId && (
        <AlertDialog
          open={!!pendingClaimHorseId}
          onOpenChange={(open) => {
            if (!open) setPendingClaimHorseId(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Claim {pendingHorse?.name} for {formatCurrency(price)}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                If your claim is drawn, {formatCurrency(price)} will be deducted from your account
                and {pendingHorse?.name ?? "the horse"} will transfer to your stable after the race
                completes. Multiple claims on the same horse are resolved randomly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPendingClaimHorseId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const result = fileClaim(race.id, pendingClaimHorseId);
                  if (result.ok) {
                    toast.success(
                      `Claim filed on ${pendingHorse?.name} for ${formatCurrency(price)}.`,
                    );
                  } else {
                    toast.error(`Claim failed: ${result.reason}`);
                  }
                  setPendingClaimHorseId(null);
                }}
              >
                File Claim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
