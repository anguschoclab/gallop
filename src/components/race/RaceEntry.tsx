import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Race } from "@/game/types";
import { ChevronRight } from "lucide-react";
import { getTransportCostForRace } from "@/core/race/transportCost";
import { HorseSelectionStep } from "./HorseSelectionStep";
import { JockeySelectionStep } from "./JockeySelectionStep";
import { TacticsSelectionStep } from "./TacticsSelectionStep";
import { ReviewStep } from "./ReviewStep";
import { ClaimingStep } from "./ClaimingStep";
import { RaceEntryHeader } from "./RaceEntryHeader";
import { buildInstructions } from "./TacticOptions";
import { useRaceEntry } from "@/hooks/race/useRaceEntry";

interface RaceEntryProps {
  race: Race;
  isOpen: boolean;
  onClose: () => void;
}

export function RaceEntry({ race, isOpen, onClose }: RaceEntryProps) {
  const {
    step,
    setStep,
    selectedHorseId,
    setSelectedHorseId,
    selectedJockeyId,
    setSelectedJockeyId,
    selectedPreset,
    setSelectedPreset,
    wantToClaim,
    setWantToClaim,
    horses,
    cash,
    day,
    raceWeather,
    isNewClaimingRace,
    claimingPrice,
    selectedHorse,
    selectedJockey,
    isHorseQualifiedForRace,
    eligibleHorses,
    marketJockeys,
    handleConfirm,
    withdrawFromClaimingRace,
    withdrawRace,
    withdrawClaim,
  } = useRaceEntry(race);

  const onConfirm = () => handleConfirm(onClose);

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
            <TacticsSelectionStep selectedPreset={selectedPreset} onSelect={setSelectedPreset} />
          )}

          {step === 4 && selectedHorse && selectedJockey && (
            <ReviewStep
              race={race}
              selectedHorse={selectedHorse}
              selectedJockey={selectedJockey}
              selectedInstructions={buildInstructions(
                {
                  id: selectedPreset,
                  name: "",
                  desc: "",
                  instructions: {
                    horseId: selectedHorse.id,
                    raceId: race.id,
                    ridingStyle: "tactical",
                    earlyPosition: "midpack",
                    moveTiming: "mid",
                    aggressiveness: 50,
                  },
                },
                selectedHorse.id,
                race.id,
              )}
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
                  onConfirm();
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
              onClick={onConfirm}
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
