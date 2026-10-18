import { Button } from "@/shared/ui/button";
import { Hint } from "@/shared/ui/Hint";
import { DisabledTooltipWrapper } from "@/shared/ui/DisabledTooltipWrapper";
import { Badge } from "@/shared/ui/badge";
import { HorsePortraitBadge } from "@/domains/horse/ui/HorsePortrait";
import { Check } from "lucide-react";
import { calculateOverallRating } from "@/domains/horse/application/horseFacade";
import { getTrackById } from "@/shared/data/tracks";
import type { Horse, Race } from "@/platform/game/types";
import { toast } from "sonner";

interface EligibleHorseRowProps {
  horse: Horse;
  race: Race;
  selectedHorseId: string | null;
  onSelectHorse: (id: string) => void;
  isHorseQualifiedForRace: (horse: Horse, race: Race) => boolean;
  isNewClaimingRace: boolean;
  day: number;
  onWithdrawFromClaimingRace: (raceId: string, horseId: string) => void;
  onWithdrawClaim: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
  onWithdrawRace: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
  onClose: () => void;
  eligible: boolean;
  isEntered: boolean;
}

export function EligibleHorseRow({
  horse,
  race,
  selectedHorseId,
  onSelectHorse,
  isHorseQualifiedForRace,
  isNewClaimingRace,
  day,
  onWithdrawFromClaimingRace,
  onWithdrawClaim,
  onWithdrawRace,
  onClose,
  eligible,
  isEntered,
}: EligibleHorseRowProps) {
  const raceEntry = race.entries.find((entry) => entry.horseId === horse.id);
  const optionalClaiming =
    race.raceClass === "OptionalClaiming" || race.raceClass === "MaidenOptionalClaiming";

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        selectedHorseId === horse.id
          ? "border-primary bg-primary/10"
          : "border-border bg-muted hover:bg-muted/80"
      } ${!eligible && !isEntered ? "opacity-50 grayscale cursor-not-allowed" : ""}`}
    >
      <button
        disabled={!eligible && !isEntered}
        onClick={() => onSelectHorse(horse.id)}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <HorsePortraitBadge
          id={horse.id}
          coatColor={horse.coatColor}
          markings={horse.markings}
          gender={horse.gender}
          appearance={horse.appearance}
          size="sm"
        />
        <div>
          <div className="font-bold flex items-center gap-2">
            {horse.name}
            {isEntered && (
              <Badge className="bg-yellow-500 text-yellow-950 text-[10px]">Entered</Badge>
            )}
            {isHorseQualifiedForRace(horse, race) && (
              <Badge className="bg-primary text-primary-foreground text-[10px]">Qualified</Badge>
            )}
            <InvitedBadge horse={horse} race={race} />
            <TrackVisitsBadge horse={horse} race={race} />
          </div>
          <div className="text-[10px] uppercase text-muted-foreground">
            OVR {calculateOverallRating(horse)} · Energy {Math.round(horse.energy)}%
          </div>
        </div>
      </button>
      <div className="flex items-center gap-2">
        {isEntered && isNewClaimingRace && (
          <div className="flex flex-col items-end gap-1">
            {optionalClaiming && !raceEntry?.withdrawnFromClaiming && (
              <ClaimingOptOutButton
                race={race}
                horse={horse}
                day={day}
                onWithdraw={onWithdrawClaim}
                onClose={onClose}
              />
            )}
            {raceEntry?.withdrawnFromClaiming && (
              <Badge variant="outline" className="text-[9px]">
                Not claimable
              </Badge>
            )}
            <ClaimingWithdrawButton
              race={race}
              horse={horse}
              day={day}
              onWithdraw={onWithdrawFromClaimingRace}
              onClose={onClose}
            />
          </div>
        )}
        {isEntered && !isNewClaimingRace && (
          <Button
            variant="destructive"
            size="sm"
            className="text-[10px] uppercase font-black tracking-wider"
            onClick={(e) => {
              e.stopPropagation();
              const res = onWithdrawRace(race.id, horse.id);
              if (res.ok) {
                toast.success(`${horse.name} withdrawn from ${race.name}`);
                onClose();
              } else {
                toast.error(`Withdrawal failed: ${res.reason}`);
              }
            }}
          >
            Withdraw
          </Button>
        )}
        {selectedHorseId === horse.id && !isEntered && <Check className="text-primary" size={20} />}
      </div>
    </div>
  );
}

function InvitedBadge({ horse, race }: { horse: Horse; race: Race }) {
  const invitedIds = race.invitedHorseIds ?? race.graded?.invitedHorseIds ?? [];
  if (!invitedIds.includes(horse.id)) return null;
  return <Badge className="bg-emerald-600 text-white text-[10px]">Invited</Badge>;
}

function TrackVisitsBadge({ horse, race }: { horse: Horse; race: Race }) {
  const trackId = race.trackId || race.graded?.trackId;
  if (!trackId) return null;
  const trackName = race.graded?.track ?? getTrackById(trackId)?.name ?? trackId;
  const visits = horse.courseVisits?.[trackId] ?? 0;
  if (visits === 0) {
    return (
      <Hint content="First time at this track">
        <Badge className="bg-slate-500 text-white text-[10px]">Debut at {trackName}</Badge>
      </Hint>
    );
  } else if (visits < 5) {
    return (
      <Hint content={`${visits} previous run(s) here`}>
        <Badge className="bg-yellow-600 text-white text-[10px]">
          {trackName}: {visits} run{visits === 1 ? "" : "s"}
        </Badge>
      </Hint>
    );
  } else {
    return (
      <Hint content={`${visits} previous runs here`}>
        <Badge className="bg-emerald-600 text-white text-[10px]">
          {trackName}: {visits} runs ★
        </Badge>
      </Hint>
    );
  }
}

function ClaimingOptOutButton({
  race,
  horse,
  day,
  onWithdraw,
  onClose,
}: {
  race: Race;
  horse: Horse;
  day: number;
  onWithdraw: (raceId: string, horseId: string) => { ok: boolean; reason?: string };
  onClose: () => void;
}) {
  const canWithdraw = day < race.day;
  return (
    <DisabledTooltipWrapper reason={!canWithdraw ? "Post time passed" : false}>
      <Button
        variant="outline"
        size="sm"
        className="text-[9px] uppercase font-black tracking-wider"
        disabled={!canWithdraw}
        onClick={(e) => {
          e.stopPropagation();
          const result = onWithdraw(race.id, horse.id);
          if (result.ok) {
            toast.success(`${horse.name} withdrawn from claiming and remains entered.`);
            onClose();
          } else {
            toast.error(`Withdrawal failed: ${result.reason}`);
          }
        }}
      >
        Withdraw from claiming
      </Button>
    </DisabledTooltipWrapper>
  );
}

function ClaimingWithdrawButton({
  race,
  horse,
  day,
  onWithdraw,
  onClose,
}: {
  race: Race;
  horse: Horse;
  day: number;
  onWithdraw: (raceId: string, horseId: string) => void;
  onClose: () => void;
}) {
  const canWithdraw = day < race.day - 1;
  return (
    <DisabledTooltipWrapper reason={!canWithdraw ? "Withdrawal closed" : false}>
      <Button
        variant="ghost"
        size="sm"
        className="text-[10px] uppercase font-black tracking-wider"
        disabled={!canWithdraw}
        onClick={(e) => {
          e.stopPropagation();
          if (canWithdraw) {
            onWithdraw(race.id, horse.id);
            toast.success(`${horse.name} withdrawn from ${race.name}.`);
            onClose();
          }
        }}
      >
        {canWithdraw ? "Withdraw entry" : "Withdrawal closed"}
      </Button>
    </DisabledTooltipWrapper>
  );
}
