import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/core/common/formatting";
import { toast } from "sonner";
import type { Horse, Stable, PrivateSaleOffer } from "@/game/types";

/**
 * Props for the PrivateSaleCounterCard component.
 */
interface PrivateSaleCounterCardProps {
  /** The counter offer from the NPC stable. */
  offer: PrivateSaleOffer;
  /** The horse being offered. */
  horse: Horse;
  /** The stable that made the counter offer. */
  stable: Stable;
  /** Player's current cash balance. */
  cash: number;
  /** Callback to respond to the private sale offer (accept/decline). */
  onRespond: (offerId: string, accept: boolean) => { ok: boolean; reason?: string };
}

/**
 * Component to display and handle a counter offer from an NPC stable.
 *
 * EXTRACTED FROM: src/routes/npc-stables.$stableId.tsx
 */
export function PrivateSaleCounterCard({
  offer,
  horse,
  stable,
  cash,
  onRespond,
}: PrivateSaleCounterCardProps) {
  if (offer.status !== "countered" || offer.counterAmount === undefined) return null;

  const counterAmt = offer.counterAmount;
  const canAffordCounter = cash >= counterAmt;

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">
              Counter offer from {stable.name}:{" "}
              <span className="tabular-nums font-bold">{formatCurrency(counterAmt)}</span>
            </p>
            <p className="text-xs text-cream-muted">Expires day {offer.expiresDay}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onRespond(offer.id, false);
              toast.info("Counter declined.");
            }}
          >
            Decline
          </Button>
          {canAffordCounter ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline">
                  Accept {formatCurrency(counterAmt)}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Accept counter offer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will pay {formatCurrency(counterAmt)} for {horse.name}. This cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      const r = onRespond(offer.id, true);
                      if (r.ok) {
                        toast.success(
                          `${horse.name} joins your stable for ${formatCurrency(counterAmt)}.`,
                        );
                      } else {
                        toast.error(r.reason ?? "Could not accept.");
                      }
                    }}
                  >
                    Accept
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button size="sm" variant="outline" disabled title="Insufficient funds">
              Accept {formatCurrency(counterAmt)}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
