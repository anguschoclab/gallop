import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/shared/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/domains/race/application/raceFacade";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import type { Race, Horse, Claim, GameState } from "@/platform/game/types";

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
  /** Pending player intents not yet persisted by the next day advance. */
  pendingIntents?: NonNullable<GameState["pendingIntents"]>;
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
  pendingIntents = [],
  cash,
  fileClaim,
}: ClaimingRacePanelProps) {
  const [pendingClaimHorseId, setPendingClaimHorseId] = useState<string | null>(null);

  // Pre-calculate hash map for O(1) horse lookups instead of running O(N) .find() inside the map loops.
  const horseMap = useMemo(() => new Map(horses.map((h) => [h.id, h])), [horses]);

  const price = race.claimingPrice;
  if (!price) return null;

  const pendingHorse = pendingClaimHorseId ? horseMap.get(pendingClaimHorseId) : null;

  return (
    <>
      <div className="ml-4 mt-1 mb-1 p-3 rounded-b-lg border border-t-0 border-border/50 bg-surface space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-warning flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Claiming Race Entries — {formatCurrency(price)}
        </p>
        <div className="space-y-1">
          {race.entries.map((entry) => {
            const entryHorse = horseMap.get(entry.horseId);
            const isOwned = entry.ownership?.type === "player";
            const playerClaimFiled =
              claims.some(
                (c) =>
                  c.raceId === race.id &&
                  c.horseId === entry.horseId &&
                  c.claimantStableId === undefined,
              ) ||
              pendingIntents.some(
                (intent) =>
                  intent.type === "claiming" &&
                  intent.raceId === race.id &&
                  intent.horseId === entry.horseId &&
                  intent.source === "player",
              );
            const canAfford = cash >= price;

            return (
              <div
                key={entry.horseId}
                className="flex items-center justify-between py-1 border-b border-border/20 last:border-0"
              >
                <Link
                  to="/stable/$horseId"
                  params={{ horseId: entry.horseId }}
                  className="text-sm text-foreground font-medium hover:underline hover:text-primary"
                >
                  {entryHorse?.name ?? entry.horseId}
                  {isOwned && <span className="ml-2 text-xs text-success">(your horse)</span>}
                </Link>
                <div>
                  {!isOwned &&
                    (playerClaimFiled ? (
                      <span className="text-xs text-muted-foreground">Claim filed.</span>
                    ) : canAfford ? (
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
