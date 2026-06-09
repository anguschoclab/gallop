import { useState, useMemo } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import { shallow } from "zustand/shallow";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Horse, Race, Jockey } from "@/game/types";
import { ChevronRight } from "lucide-react";
import { getCurrentYear } from "@/game/raceSchedule";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { formatCurrency } from "@/lib/formatting";
import { toast } from "sonner";
import { getTransportCostForRace } from "@/core/race/transportCost";
import { HorseSelectionStep } from "./raceEntry/HorseSelectionStep";
import { JockeySelectionStep } from "./raceEntry/JockeySelectionStep";
import { TacticsSelectionStep } from "./raceEntry/TacticsSelectionStep";
import { ReviewStep } from "./raceEntry/ReviewStep";
import { ClaimingStep } from "./raceEntry/ClaimingStep";
import { RaceEntryHeader } from "./raceEntry/RaceEntryHeader";

interface RaceEntryProps {
  race: Race;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * A multi-step dialog component for entering a horse into a race.
 * Handles horse selection, jockey assignment, tactical instructions, and financial review.
 *
 * @param {RaceEntryProps} props - The component properties.
 * @returns {JSX.Element} The rendered race entry dialog.
 */
export function RaceEntry({ race, isOpen, onClose }: RaceEntryProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [selectedJockeyId, setSelectedJockeyId] = useState<string | null>(null);
  const [selectedTactics, setSelectedTactics] = useState<
    "lead" | "rail" | "outside" | "save" | "late_kick" | "default"
  >("default");
  const [wantToClaim, setWantToClaim] = useState(false);

  const allHorses = useGameWithShallow((s) => s.horses);
  const horses = useMemo(() => allHorses.filter((h: Horse) => h.owned), [allHorses]);
  const jockeys = useGameWithShallow((s) => s.jockeys ?? []);
  const enterRace = useGame((s) => s.enterRace);
  const enterClaimingRace = useGame((s) => s.enterClaimingRace);
  const withdrawFromClaimingRace = useGame((s) => s.withdrawFromClaimingRace);
  const assignJockey = useGame((s) => s.assignJockey);
  const setRaceTactics = useGame((s) => s.setRaceTactics);
  const submitClaim = useGame((s) => s.submitClaim);
  const withdrawClaim = useGame((s) => s.withdrawClaim);
  const withdrawRace = useGame((s) => s.withdrawRace);
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  const raceWeather = useGame((s) => {
    const trackId = race.trackId ?? race.graded?.trackId;
    if (!trackId) return undefined;
    const buf = s.weather?.byTrack?.[trackId];
    if (!buf || !buf.length) return undefined;
    return buf.find((w: any) => w.day === race.day) ?? buf[buf.length - 1];
  });
  // D3: determine if this is a new-spec claiming race
  const isNewClaimingRace = !!race.claiming;
  const claimingPrice = race.claiming?.price ?? race.claimingPrice;

  const selectedHorse = useMemo(
    () => horses.find((h: Horse) => h.id === selectedHorseId),
    [horses, selectedHorseId],
  );
  const selectedJockey = useMemo(
    () => jockeys.find((j: Jockey) => j.id === selectedJockeyId),
    [jockeys, selectedJockeyId],
  );

  const isHorseQualifiedForRace = (horse: Horse, race: Race): boolean => {
    if (!race.graded?.key || !horse.winAndYouInQualified) return false;
    const currentYear = getCurrentYear(day);
    return horse.winAndYouInQualified.some(
      (q) => q.raceKey === race.graded!.key && q.year === currentYear,
    );
  };

  const eligibleHorses = useMemo(() => {
    return horses.map((h: Horse) => ({
      horse: h,
      eligible: isHorseEligibleForRace(h, race, new Set(), day),
    }));
  }, [horses, race, day]);

  const marketJockeys = useMemo(() => {
    // Retained jockeys + freelance pool
    return jockeys.filter((j: Jockey) => !j.stableId || j.contractUntil); // Simple filter for now
  }, [jockeys]);

  const handleConfirm = () => {
    if (selectedHorseId && selectedJockeyId) {
      const wasFull = race.entries.length >= race.fieldSize;
      // D3: use enterClaimingRace for new claiming races
      const res = isNewClaimingRace
        ? enterClaimingRace(race.id, selectedHorseId)
        : enterRace(race.id, selectedHorseId);
      if (res.ok) {
        assignJockey(race.id, selectedHorseId, selectedJockeyId);
        setRaceTactics(race.id, selectedHorseId, selectedTactics);

        // Submit claim if selected (old-style claimingPrice)
        if (wantToClaim && race.claimingPrice && !isNewClaimingRace) {
          const claimRes = submitClaim(race.id, selectedHorseId);
          if (!claimRes.ok) {
            alert(`Claim failed: ${claimRes.reason}`);
            return;
          }
        }

        if (isNewClaimingRace) {
          const horse = horses.find((h: Horse) => h.id === selectedHorseId);
          toast.info(
            `${horse?.name ?? "Horse"} entered in claiming race at ${formatCurrency(claimingPrice!)}.`,
          );
        } else if (wasFull) {
          const horse = horses.find((h: Horse) => h.id === selectedHorseId);
          toast.info(
            `${horse?.name ?? "Horse"} bumped a weaker entry to join ${race.name}.`,
          );
        }

        onClose();
      } else {
        alert(res.reason);
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase italic text-primary flex items-center gap-2">
            Race Entry: {race.name}
          </DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          <RaceEntryHeader race={race} raceWeather={raceWeather} />
        </DialogHeader>

        <div className="py-4 min-h-[400px]">
          {step === 1 && (
            <HorseSelectionStep
              horses={horses}
              race={race}
              selectedHorseId={selectedHorseId}
              onSelectHorse={setSelectedHorseId}
              isHorseQualifiedForRace={isHorseQualifiedForRace}
              isNewClaimingRace={isNewClaimingRace}
              day={day}
              onWithdrawFromClaimingRace={withdrawFromClaimingRace}
              onWithdrawRace={withdrawRace}
              onClose={onClose}
            />
          )}

          {step === 2 && selectedHorse && (
            <JockeySelectionStep
              marketJockeys={marketJockeys}
              selectedJockeyId={selectedJockeyId}
              selectedHorse={selectedHorse}
              onSelect={setSelectedJockeyId}
            />
          )}

          {step === 3 && selectedHorse && (
            <TacticsSelectionStep
              selectedTactics={selectedTactics}
              onSelect={setSelectedTactics}
            />
          )}

          {step === 4 && selectedHorse && selectedJockey && (
            <ReviewStep
              race={race}
              selectedHorse={selectedHorse}
              selectedJockey={selectedJockey}
              selectedTactics={selectedTactics}
              isHorseQualifiedForRace={isHorseQualifiedForRace}
              isNewClaimingRace={isNewClaimingRace}
              claimingPrice={claimingPrice}
              wantToClaim={wantToClaim}
              cash={cash}
            />
          )}

          {step === 5 && selectedHorse && (
            <ClaimingStep
              race={race}
              selectedHorse={selectedHorse}
              wantToClaim={wantToClaim}
              onToggleClaim={setWantToClaim}
              onWithdrawClaim={withdrawClaim}
            />
          )}
        </div>

        <DialogFooter className="flex justify-between items-center">
          {step > 1 && (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)}
              className="uppercase font-black tracking-widest text-[10px]"
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 5 ? (
            <Button
              disabled={(step === 1 && !selectedHorseId) || (step === 2 && !selectedJockeyId)}
              onClick={() => {
                if (step === 4 && race.claimingPrice) {
                  setStep(5);
                } else if (step === 4 && !race.claimingPrice) {
                  handleConfirm();
                } else {
                  setStep((s) => Math.min(s + 1, 5) as 1 | 2 | 3 | 4 | 5);
                }
              }}
              className="uppercase font-black tracking-widest text-[10px]"
            >
              {step === 4 && !race.claimingPrice ? "Confirm Entry" : "Next Step"}
              <ChevronRight size={14} className="ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={
                selectedHorse && selectedJockey
                  ? cash <
                    (isHorseQualifiedForRace(selectedHorse, race)
                      ? selectedJockey.ridingFee + getTransportCostForRace(race)
                      : race.entryFee +
                        selectedJockey.ridingFee +
                        getTransportCostForRace(race) +
                        (wantToClaim ? race.claimingPrice! : 0))
                  : true
              }
              className="uppercase font-black tracking-widest text-[10px] bg-primary text-primary-foreground px-8"
            >
              Confirm Entry
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
