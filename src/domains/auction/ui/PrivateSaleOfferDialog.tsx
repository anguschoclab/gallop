import { useState, useId } from "react";
import { useGame } from "@/platform/game/store";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/ui/dialog";
import { toast } from "sonner";
import { formatCurrency } from "@/shared/common/formatting";
import { calculateLotValuation } from "@/domains/auction/application/auctionFacade";
import { Badge } from "@/shared/ui/badge";
import {
  evaluateHorseAttachment,
  attachmentAdjustedAsk,
  knownBuyerPremiumMultiplier,
  suggestedOfferTiers,
} from "@/domains/horse/application/horseFacade";
import {
  getReputationTier,
  formatReputationTier,
} from "@/domains/reputation/application/reputationFacade";
import { AttachmentBreakdown } from "@/domains/auction/ui/AttachmentBreakdown";
import { CashPressureBadge } from "@/domains/stable/ui/CashPressureBadge";
import { OverrideNegotiationPanel } from "@/domains/auction/ui/OverrideNegotiationPanel";
import type { Horse, Stable } from "@/platform/game/types";

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

const parseOfferAmount = (raw: string) => Number(raw.replace(/,/g, "").replace(/\$/g, ""));

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
  const npcAIManager = useGame((s) => s.npcAIManager);
  const reputationScore = useGame((s) => s.reputation?.score ?? 0);

  const valuation = calculateLotValuation(horse, stable, "racing_age", allHorses);
  const fogLow = Math.round(valuation * 0.8);
  const fogHigh = Math.round(valuation * 1.2);
  const attachment = evaluateHorseAttachment(horse, stable);
  const ask = attachmentAdjustedAsk(horse, stable, valuation, reputationScore);
  const tiers = suggestedOfferTiers(ask);
  const knownBuyerPremium = knownBuyerPremiumMultiplier(attachment.tier, reputationScore);
  const premiumOverMarket = valuation > 0 ? ask / valuation - 1 : 0;
  const friction = npcAIManager?.stableStates?.[stable.id]?.friction ?? 0;

  const handleSubmitOffer = () => {
    const amount = parseOfferAmount(offerAmount);

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
          <AttachmentSummary
            stable={stable}
            attachment={attachment}
            ask={ask}
            valuation={valuation}
            offerAmount={offerAmount}
            premiumOverMarket={premiumOverMarket}
            knownBuyerPremium={knownBuyerPremium}
            reputationScore={reputationScore}
          />
          <ValuationEstimate fogLow={fogLow} fogHigh={fogHigh} ask={ask} />
          <QuickOffers
            tiers={tiers}
            onPick={(amount) => {
              setOfferAmount(formatCurrency(amount));
              setOfferError("");
            }}
          />
          <OfferOverride
            horse={horse}
            stable={stable}
            attachment={attachment}
            ask={ask}
            valuation={valuation}
            cash={cash}
            friction={friction}
            reputationScore={reputationScore}
            onSuccess={() => {
              setOfferAmount("");
              setOfferError("");
              onClose();
            }}
            onError={setOfferError}
          />
          <OfferAmountField
            offerId={offerId}
            offerAmount={offerAmount}
            offerError={offerError}
            onChange={setOfferAmount}
            onClearError={() => setOfferError("")}
          />
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

interface AttachmentSummaryProps {
  stable: Stable;
  attachment: ReturnType<typeof evaluateHorseAttachment>;
  ask: number;
  valuation: number;
  offerAmount: string;
  premiumOverMarket: number;
  knownBuyerPremium: number;
  reputationScore: number;
}

function AttachmentSummary({
  stable,
  attachment,
  ask,
  valuation,
  offerAmount,
  premiumOverMarket,
  knownBuyerPremium,
  reputationScore,
}: AttachmentSummaryProps) {
  return (
    <div className="rounded-md border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={attachment.tier === "available" ? "secondary" : "outline"}>
          {attachment.label}
        </Badge>
        <span className="text-xs text-muted-foreground tabular-nums">
          asking ×{attachment.askMultiplier.toFixed(2)} of market
        </span>
      </div>
      <CashPressureBadge
        stable={stable}
        ask={ask}
        offerAmount={parseOfferAmount(offerAmount) || undefined}
      />
      <p className="text-xs text-muted-foreground">{attachment.blurb}</p>
      {premiumOverMarket > 0.08 && (
        <p className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-300">
          They want ~{Math.round(premiumOverMarket * 100)}% above market value (+
          {formatCurrency(Math.max(0, ask - valuation))}) — {attachment.label.toLowerCase()} horse
          {knownBuyerPremium > 0 && (
            <>
              {" "}
              plus a +{Math.round(knownBuyerPremium * 100)}% known-buyer premium because you're a{" "}
              {formatReputationTier(getReputationTier(reputationScore))} name
            </>
          )}
          .
        </p>
      )}
      <AttachmentBreakdown attachment={attachment} />
    </div>
  );
}

function ValuationEstimate({
  fogLow,
  fogHigh,
  ask,
}: {
  fogLow: number;
  fogHigh: number;
  ask: number;
}) {
  return (
    <p className="text-sm text-muted-foreground">
      Estimated market value:{" "}
      <span className="tabular-nums font-medium text-foreground">
        ~{formatCurrency(fogLow)} – {formatCurrency(fogHigh)}
      </span>
      <br />
      Their likely ask:{" "}
      <span className="tabular-nums font-medium text-foreground">{formatCurrency(ask)}</span>
    </p>
  );
}

function QuickOffers({
  tiers,
  onPick,
}: {
  tiers: ReturnType<typeof suggestedOfferTiers>;
  onPick: (amount: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">Quick offers</p>
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
            onClick={() => onPick(amount)}
          >
            {label} · {formatCurrency(amount)}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface OfferOverrideProps {
  horse: Horse;
  stable: Stable;
  attachment: ReturnType<typeof evaluateHorseAttachment>;
  ask: number;
  valuation: number;
  cash: number;
  friction: number;
  reputationScore: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}

function OfferOverride({
  horse,
  stable,
  attachment,
  ask,
  valuation,
  cash,
  friction,
  reputationScore,
  onSuccess,
  onError,
}: OfferOverrideProps) {
  const requestOverride = useGame((s) => s.requestOverride);
  return (
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
            onSuccess();
          } else {
            onError(result.reason ?? "Override failed.");
          }
        }
      }}
    />
  );
}

interface OfferAmountFieldProps {
  offerId: string;
  offerAmount: string;
  offerError: string;
  onChange: (value: string) => void;
  onClearError: () => void;
}

function OfferAmountField({
  offerId,
  offerAmount,
  offerError,
  onChange,
  onClearError,
}: OfferAmountFieldProps) {
  return (
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
          onChange(e.target.value);
          onClearError();
        }}
        className="tabular-nums"
        onBlur={() => {
          const n = parseOfferAmount(offerAmount);
          if (n > 0) onChange(formatCurrency(n));
        }}
      />
      {offerError && <p className="text-xs text-destructive">{offerError}</p>}
    </div>
  );
}
