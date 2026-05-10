import { useState } from "react";
import { useGame } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatting";
import { calculateLotValuation } from "@/game/auction";
import type { Horse, Stable } from "@/game/types";

/**
 * Helper to get a flavored decline message based on stable personality.
 */
function getDeclineFlavour(personality: string, stableName: string): string {
  switch (personality) {
    case "aggressive":
      return "Not for sale at that price. Try harder.";
    case "prestige":
      return "This horse is not for sale to just anyone.";
    case "conservative":
      return "We don't sell below market.";
    case "breeder":
      return "We intend to breed from this horse.";
    default:
      return `${stableName} declined your offer.`;
  }
}

/**
 * Props for the PrivateSaleOfferDialog component.
 */
interface PrivateSaleOfferDialogProps {
  /** The horse being offered for purchase. */
  horse: Horse;
  /** The stable that owns the horse. */
  stable: Stable;
  /** Whether the dialog is open. */
  isOpen: boolean;
  /** Callback to close the dialog. */
  onClose: () => void;
  /** Player's current cash balance. */
  cash: number;
  /** All horses in the game (for valuation context). */
  allHorses: Horse[];
}

/**
 * Component to handle making a private sale offer for an NPC horse.
 *
 * EXTRACTED FROM: src/routes/npc-stables.$stableId.tsx
 */
export function PrivateSaleOfferDialog({
  horse,
  stable,
  isOpen,
  onClose,
  cash,
  allHorses,
}: PrivateSaleOfferDialogProps) {
  const [offerAmount, setOfferAmount] = useState("");
  const [offerError, setOfferError] = useState("");
  const proposePrivateSale = useGame((s) => s.proposePrivateSale);

  const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses);
  const fogLow = Math.round(valuation * 0.8);
  const fogHigh = Math.round(valuation * 1.2);

  const handleSubmitOffer = () => {
    const amount = Number(offerAmount.replace(/,/g, "").replace(/\$/g, ""));
    if (!amount || amount <= 0) {
      setOfferError("Please enter a valid offer amount.");
      return;
    }
    if (cash < amount) {
      setOfferError(`Insufficient funds. You need ${formatCurrency(amount - cash)} more.`);
      return;
    }

    const result = proposePrivateSale(horse.id, stable.id, amount);
    if (!result.ok) {
      if (result.reason === "insufficient_funds") {
        setOfferError(`Insufficient funds.`);
      } else {
        setOfferError(result.reason ?? "Offer failed.");
      }
      return;
    }

    // Close dialog
    setOfferAmount("");
    setOfferError("");
    onClose();

    // Show outcome toast
    const status = result.reason;
    if (status === "accepted") {
      toast.success(
        `${stable.name} accepted your offer of ${formatCurrency(amount)} for ${horse.name}. They join your stable.`,
      );
    } else if (status === "countered") {
      // Read the fresh store state synchronously to get counter amount
      const freshOffers = (useGame.getState() as any).privateSaleOffers ?? [];
      const counterOffer = freshOffers.find(
        (o: any) => o.horseId === horse.id && o.status === "countered",
      );
      const counterAmt = counterOffer?.counterAmount ?? 0;
      toast.info(
        `${stable.name} countered at ${formatCurrency(counterAmt)}. Go to Rival Stables to respond.`,
      );
    } else {
      toast.error(getDeclineFlavour(stable.personality, stable.name));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make an offer for {horse.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-cream-muted">
            Estimated market value:{" "}
            <span className="tabular-nums font-medium text-cream">
              ~{formatCurrency(fogLow)} – {formatCurrency(fogHigh)}
            </span>
          </p>
          <div className="space-y-1">
            <label className="text-sm font-medium">Your offer amount</label>
            <Input
              inputMode="numeric"
              placeholder="e.g. 25000"
              value={offerAmount}
              onChange={(e) => {
                setOfferAmount(e.target.value);
                setOfferError("");
              }}
              className="tabular-nums"
              onBlur={() => {
                const n = Number(offerAmount.replace(/,/g, "").replace(/\$/g, ""));
                if (n > 0) setOfferAmount(formatCurrency(n));
              }}
            />
            {offerError && <p className="text-xs text-destructive">{offerError}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmitOffer}>Submit Offer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
