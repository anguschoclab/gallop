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
import { Badge } from "@/components/ui/badge";
import {
  evaluateHorseAttachment,
  attachmentAdjustedAsk,
  suggestedOfferTiers,
} from "@/core/horse/attachment";
import { AttachmentBreakdown } from "@/components/auction/AttachmentBreakdown";
import { OverrideNegotiationPanel } from "@/components/auction/OverrideNegotiationPanel";
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
  const requestOverride = useGame((s) => s.requestOverride);
  const npcAIManager = useGame((s) => s.npcAIManager);
  const reputationScore = useGame((s) => s.reputation?.score ?? 0);

  const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses);
  const fogLow = Math.round(valuation * 0.8);
  const fogHigh = Math.round(valuation * 1.2);
  const attachment = evaluateHorseAttachment(horse, stable);
  const ask = attachmentAdjustedAsk(horse, stable, valuation, reputationScore);
  const tiers = suggestedOfferTiers(ask);
  const friction = npcAIManager?.stableStates?.[stable.id]?.friction ?? 0;

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
          <div className="rounded-md border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={attachment.tier === "available" ? "secondary" : "outline"}>
                {attachment.label}
              </Badge>
              <span className="text-xs text-cream-muted tabular-nums">
                asking ×{attachment.askMultiplier.toFixed(2)} of market
              </span>
            </div>
            <p className="text-xs text-cream-muted">{attachment.blurb}</p>
            <AttachmentBreakdown attachment={attachment} />
          </div>
          <p className="text-sm text-cream-muted">
            Estimated market value:{" "}
            <span className="tabular-nums font-medium text-cream">
              ~{formatCurrency(fogLow)} – {formatCurrency(fogHigh)}
            </span>
            <br />
            Their likely ask:{" "}
            <span className="tabular-nums font-medium text-cream">{formatCurrency(ask)}</span>
          </p>
          <div className="space-y-1">
            <p className="text-xs font-medium text-cream-muted">Quick offers</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["Lowball", tiers.lowball],
                  ["Fair", tiers.fair],
                  ["Blow them away", tiers.generous],
                ] as const
              ).map(([label, amount]) => (
                <Button
                  key={label}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOfferAmount(formatCurrency(amount));
                    setOfferError("");
                  }}
                >
                  {label} · {formatCurrency(amount)}
                </Button>
              ))}
            </div>
          </div>
          <OverrideNegotiationPanel
            horse={horse}
            stable={stable}
            attachment={attachment}
            ask={ask}
            valuation={valuation}
            cash={cash}
            friction={friction}
            reputationScore={reputationScore}
            onOverride={(type) => {
              const pendingOffer = useGame
                .getState()
                .privateSaleOffers.find((o) => o.horseId === horse.id && o.status === "pending");
              if (pendingOffer) {
                const result = requestOverride(pendingOffer.id, type);
                if (result.ok) {
                  toast.success(`Override submitted for ${horse.name}.`);
                  setOfferAmount("");
                  setOfferError("");
                  onClose();
                } else {
                  setOfferError(result.reason ?? "Override failed.");
                }
              }
            }}
          />
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
