import { useState, useId } from "react";
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
import { formatCurrency } from "@/core/common/formatting";
import { calculateLotValuation } from "@/core/auction/engine";
import type { Horse, Stable } from "@/game/types";

function getOfferErrorMessage(
  amount: number,
  cash: number,
  result: { ok: boolean; reason?: string },
): string | null {
  if (!amount || amount <= 0) return "Please enter a valid offer amount.";
  if (cash < amount) return `Insufficient funds. You need ${formatCurrency(amount - cash)} more.`;
  if (!result.ok) {
    if (result.reason === "insufficient_funds") return "Insufficient funds.";
    return result.reason ?? "Offer failed.";
  }
  return null;
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
  const offerId = useId();
  const [offerAmount, setOfferAmount] = useState("");
  const [offerError, setOfferError] = useState("");
  const proposePrivateSale = useGame((s) => s.proposePrivateSale);

  const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses);
  const fogLow = Math.round(valuation * 0.8);
  const fogHigh = Math.round(valuation * 1.2);

  const handleSubmitOffer = () => {
    const amount = Number(offerAmount.replace(/,/g, "").replace(/\$/g, ""));

    const preValidation = getOfferErrorMessage(amount, cash, { ok: true });
    if (preValidation) {
      setOfferError(preValidation);
      return;
    }

    const result = proposePrivateSale(horse.id, stable.id, amount);
    const error = getOfferErrorMessage(amount, cash, result);
    if (error) {
      setOfferError(error);
      return;
    }

    setOfferAmount("");
    setOfferError("");
    onClose();

    toast.success(
      `Offer of ${formatCurrency(amount)} submitted for ${horse.name}. ${stable.name} will respond next day.`,
    );
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
            <label htmlFor={offerId} className="text-sm font-medium">
              Your offer amount
            </label>
            <Input
              id={offerId}
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
