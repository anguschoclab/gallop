import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HorsePortraitBadge } from "@/components/horse/HorsePortrait";
import { Check } from "lucide-react";
import { calculateOverallRating } from "@/core/horse/stats";
import { getTrackById } from "@/data/tracks";
import type { Horse, Race } from "@/game/types";
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
  onWithdrawRace,
  onClose,
  eligible,
  isEntered,
}: EligibleHorseRowProps) {
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
            Rating {calculateOverallRating(horse)} · Energy {horse.energy}%
          </div>
        </div>
      </button>
      <div className="flex items-center gap-2">
        {isEntered && isNewClaimingRace && (
          <ClaimingWithdrawButton
            race={race}
            horse={horse}
            day={day}
            onWithdraw={onWithdrawFromClaimingRace}
            onClose={onClose}
          />
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
                alert(`${horse.name} withdrawn from ${race.name}`);
                onClose();
              } else {
                alert(`Withdrawal failed: ${res.reason}`);
              }
            }}
          >
            Withdraw
          </Button>
        )}
        {selectedHorseId === horse.id && !isEntered && (
          <Check className="text-primary" size={20} />
        )}
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
      <Badge className="bg-slate-500 text-white text-[10px]" title="First time at this track">
        Debut at {trackName}
      </Badge>
    );
  } else if (visits < 5) {
    return (
      <Badge
        className="bg-yellow-600 text-white text-[10px]"
        title={`${visits} previous run(s) here`}
      >
        {trackName}: {visits} run{visits === 1 ? "" : "s"}
      </Badge>
    );
  } else {
    return (
      <Badge
        className="bg-emerald-600 text-white text-[10px]"
        title={`${visits} previous runs here`}
      >
        {trackName}: {visits} runs ★
      </Badge>
    );
  }
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
    <Button
      variant="ghost"
      size="sm"
      className="text-[10px] uppercase font-black tracking-wider"
      disabled={!canWithdraw}
      title={canWithdraw ? undefined : "Withdrawal closed"}
      onClick={(e) => {
        e.stopPropagation();
        if (canWithdraw) {
          onWithdraw(race.id, horse.id);
          toast.success(`${horse.name} withdrawn from ${race.name}.`);
          onClose();
        }
      }}
    >
      {canWithdraw ? "Withdraw" : "Withdrawal closed"}
    </Button>
  );
}
