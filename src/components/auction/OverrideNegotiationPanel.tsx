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
import { DisabledTooltipWrapper } from "@/components/ui/DisabledTooltipWrapper";
import { formatCurrency } from "@/core/common/formatting";
import { computePremiumBuyout, computeDiplomaticPressure } from "@/core/horse/overrideNegotiation";
import { evaluateHorseAttachment, attachmentAdjustedAsk } from "@/core/horse/attachment";
import type { Horse, Stable } from "@/game/types";

interface OverrideNegotiationPanelProps {
  horse: Horse;
  stable: Stable;
  attachment: ReturnType<typeof evaluateHorseAttachment>;
  ask: number;
  valuation: number;
  cash: number;
  onOverride: (type: "premium" | "diplomatic") => void;
}

export function OverrideNegotiationPanel({
  horse,
  stable,
  attachment,
  ask,
  valuation,
  cash,
  onOverride,
}: OverrideNegotiationPanelProps) {
  if (attachment.tier !== "protected" && attachment.tier !== "untouchable") {
    return null;
  }

  const premium = computePremiumBuyout(attachment, ask);
  const friction = 0;
  const reputationScore = 50;
  const diplomatic = computeDiplomaticPressure(attachment, ask, friction, reputationScore);

  return (
    <div className="space-y-2 border-t border-border/60 pt-3">
      <p className="text-xs font-medium text-cream-muted">Override options</p>

      <div className="flex flex-wrap gap-2">
        {/* Premium Buyout */}
        {cash < premium.cost ? (
          <DisabledTooltipWrapper reason="Insufficient funds for premium buyout">
            <Button size="sm" variant="outline" disabled>
              Premium · {formatCurrency(premium.cost)}
            </Button>
          </DisabledTooltipWrapper>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                Premium · {formatCurrency(premium.cost)}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Premium buyout for {horse.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Pay {formatCurrency(premium.cost)} to guarantee acquisition from {stable.name}.
                  This is a guaranteed acquisition — the stable cannot refuse.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onOverride("premium")}>
                  Confirm Buyout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Diplomatic Pressure */}
        {cash < diplomatic.successCost ? (
          <DisabledTooltipWrapper reason="Insufficient funds for diplomatic pressure">
            <Button size="sm" variant="outline" disabled>
              Diplomatic · {Math.round(diplomatic.odds * 100)}% odds
            </Button>
          </DisabledTooltipWrapper>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline">
                Diplomatic · {Math.round(diplomatic.odds * 100)}% odds
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apply diplomatic pressure for {horse.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Success chance: {Math.round(diplomatic.odds * 100)}%. If successful, you pay{" "}
                  {formatCurrency(diplomatic.successCost)} and the horse is released.
                  {" "}
                  {diplomatic.failurePenalty}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onOverride("diplomatic")}>
                  Apply Pressure
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
