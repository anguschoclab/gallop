import { Button } from "@/components/ui/button";
import type { Horse, Race } from "@/game/types";
import { formatCurrency } from "@/core/common/formatting";

interface Props {
  race: Race;
  selectedHorse: Horse;
  wantToClaim: boolean;
  onToggleClaim: (val: boolean) => void;
  onWithdrawClaim: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
}

export function ClaimingStep({
  race,
  selectedHorse,
  wantToClaim,
  onToggleClaim,
  onWithdrawClaim,
}: Props) {
  const claimingPrice = race.claimingPrice;
  if (!claimingPrice) return null;

  return (
    <div className="space-y-6 animate-in zoom-in-95 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">
        Claiming Option
      </h3>

      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="claim-checkbox"
            checked={wantToClaim}
            onChange={(e) => onToggleClaim(e.target.checked)}
            className="w-5 h-5 rounded border-primary"
          />
          <label htmlFor="claim-checkbox" className="flex-1">
            <div className="font-bold">Claim this horse</div>
            <div className="text-sm text-muted-foreground">
              If you win the claim, you'll pay {formatCurrency(claimingPrice)} and become the new
              owner. If another stable claims it, you'll lose the horse but receive the claiming
              price.
            </div>
          </label>
        </div>

        {wantToClaim && (
          <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs font-bold text-destructive">
              Warning: If another stable claims this horse, it will be transferred to them and
              you'll receive the claiming price.
            </p>
          </div>
        )}
      </div>

      {(race.raceClass === "OptionalClaiming" || race.raceClass === "MaidenOptionalClaiming") && (
        <Button
          variant="outline"
          onClick={() => {
            const res = onWithdrawClaim(race.id, selectedHorse.id);
            if (res.ok) {
              alert("Horse withdrawn from claiming (entry fee forfeited)");
            } else {
              alert(`Withdrawal failed: ${res.reason}`);
            }
          }}
          className="w-full uppercase font-black tracking-widest text-[10px]"
        >
          Withdraw Horse from Claiming
        </Button>
      )}
    </div>
  );
}
