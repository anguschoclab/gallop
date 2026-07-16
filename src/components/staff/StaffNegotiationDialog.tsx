import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/core/common/formatting";
import { STAFF_ROLE_LABELS, STAFF_TIER_LABELS } from "@/core/staff/staffConfig";
import { PATIENCE_BY_TIER } from "@/core/staff/staffNegotiation";
import type { StaffMember } from "@/core/staff/staffTypes";
import { useStaffNegotiation } from "@/hooks/staff/useStaffNegotiation";

interface StaffNegotiationDialogProps {
  staff: StaffMember;
  isOpen: boolean;
  onClose: () => void;
}

function getStaffQuote(roundsUsed: number, patience: number, tier: string): string {
  if (roundsUsed === 0) {
    return "I'm looking for the right opportunity. What are you offering?";
  }
  if (tier === "elite") {
    return "My time is valuable. Don't insult me.";
  }
  if (roundsUsed < patience) {
    return "I expected better. I'm willing to hear one more offer.";
  }
  return "This isn't working. I have other options.";
}

export function StaffNegotiationDialog({ staff, isOpen, onClose }: StaffNegotiationDialogProps) {
  const offerInputId = useId();
  const {
    offerAmount,
    setOfferAmount,
    offerError,
    setOfferError,
    roundsUsed,
    askingSalary,
    patience,
    minOffer,
    handleClose,
    handleSubmit,
  } = useStaffNegotiation(staff, onClose);

  const roleLabel = STAFF_ROLE_LABELS[staff.role];
  const tierLabel = STAFF_TIER_LABELS[staff.tier];
  const quote = getStaffQuote(roundsUsed, patience, staff.tier);
  const roundsLeft = Math.max(0, patience - roundsUsed);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-white/10 rounded-none">
        <DialogHeader>
          <DialogTitle className="text-cream font-[family-name:var(--font-display)] uppercase tracking-tight">
            Negotiate with {staff.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="flex items-center gap-3 text-[10px] font-mono uppercase text-cream/40 tracking-widest">
            <span className="px-2 py-0.5 border border-white/10 bg-white/5">{tierLabel}</span>
            <span>{roleLabel}</span>
            <span className="text-gold">Fame {staff.fame}</span>
          </div>

          <div className="bg-black/30 border border-white/5 p-4 italic text-sm text-cream/70 font-mono">
            "{quote}"
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-mono uppercase text-cream/40 tracking-widest">
              <span>
                Asking:{" "}
                <span className="text-cream font-bold tabular-nums">
                  {formatCurrency(askingSalary)}/day
                </span>
              </span>
              <span>
                Floor:{" "}
                <span className="text-cream/60 tabular-nums">{formatCurrency(minOffer)}</span>
              </span>
            </div>

            {patience > 0 && (
              <div className="text-[9px] font-mono uppercase text-cream/30 tracking-widest">
                Patience:{" "}
                {roundsLeft === 0 ? (
                  <span className="text-destructive">Final warning</span>
                ) : (
                  <span>
                    {roundsLeft} counter{roundsLeft !== 1 ? "s" : ""} remaining
                  </span>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label
                htmlFor={offerInputId}
                className="text-[10px] font-black uppercase text-cream/50 tracking-widest"
              >
                Your offer (per day)
              </label>
              <Input
                id={offerInputId}
                inputMode="numeric"
                placeholder={`e.g. ${Math.round(askingSalary * 0.9)}`}
                value={offerAmount}
                onChange={(e) => {
                  setOfferAmount(e.target.value);
                  setOfferError("");
                }}
                onBlur={() => {
                  const n = Number(offerAmount.replace(/,/g, "").replace(/\$/g, ""));
                  if (n > 0) setOfferAmount(String(n));
                }}
                className="bg-black/40 border-white/10 text-cream font-mono tabular-nums rounded-none"
              />
              {offerError && <p className="text-xs text-destructive font-mono">{offerError}</p>}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            className="rounded-none border border-white/10 text-cream/50 hover:text-cream text-[10px] uppercase tracking-widest"
            onClick={handleClose}
          >
            Walk Away
          </Button>
          <Button
            className="rounded-none bg-gold hover:bg-gold-bright text-slate-950 font-black uppercase tracking-[0.2em] text-[10px]"
            onClick={handleSubmit}
          >
            Make Offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
