import { useState, useMemo } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import type { Horse, Race, Jockey } from "@/game/types";
import type { WeatherState } from "@/core/weather/weatherTypes";
import { getCurrentYear } from "@/core/race/schedule";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { buildInstructions, type PresetId } from "@/components/race/TacticOptions";
import { toast } from "sonner";
import { formatCurrency } from "@/core/common/formatting";
import { isPlayerOwned } from "@/core/horse/ownership";

export function useRaceEntry(race: Race) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [selectedJockeyId, setSelectedJockeyId] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("default");
  const [wantToClaim, setWantToClaim] = useState(false);

  const allHorses = useGameWithShallow((s) => s.horses);
  const horses = useMemo(() => Object.values(allHorses) as Horse[], [allHorses]);
  const jockeys = useGameWithShallow((s) => s.jockeys ?? []);
  const enterRace = useGame((s) => s.enterRace);
  const enterClaimingRace = useGame((s) => s.enterClaimingRace);
  const withdrawFromClaimingRace = useGame((s) => s.withdrawFromClaimingRace);
  const assignJockey = useGame((s) => s.assignJockey);
  const setRaceTactics = useGame((s) => s.setRaceTactics);
  const submitClaim = useGame((s) => s.submitClaim);
  const withdrawRace = useGame((s) => s.withdrawRace);
  const withdrawClaim = useGame((s) => s.withdrawClaim);
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  const raceWeather = useGame((s) => {
    const trackId = race.trackId ?? race.graded?.trackId;
    if (!trackId) return undefined;
    const buf = s.weather?.byTrack?.[trackId];
    if (!buf || !buf.length) return undefined;
    return buf.find((w: WeatherState) => w.day === race.day) ?? buf[buf.length - 1];
  });

  const isNewClaimingRace = !!race.claiming;
  const claimingPrice = race.claiming?.price ?? race.claimingPrice;

  const selectedHorse = useMemo(
    () => (selectedHorseId ? allHorses[selectedHorseId] : undefined),
    [allHorses, selectedHorseId],
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
    return horses
      .filter((h) => isPlayerOwned(h))
      .map((h: Horse) => ({
        horse: h,
        eligible: isHorseEligibleForRace(h, race, new Set(), day),
      }));
  }, [horses, race, day]);

  const marketJockeys = useMemo(() => {
    return jockeys.filter((j: Jockey) => !j.stableId || j.contractUntil);
  }, [jockeys]);

  const handleConfirm = (onClose: () => void) => {
    if (selectedHorseId && selectedJockeyId) {
      const wasFull = race.entries.length >= race.fieldSize;
      const res = isNewClaimingRace
        ? enterClaimingRace(race.id, selectedHorseId)
        : enterRace(race.id, selectedHorseId);
      if (res.ok) {
        assignJockey(race.id, selectedHorseId, selectedJockeyId);
        const instructions = buildInstructions(
          {
            id: selectedPreset,
            name: "",
            desc: "",
            instructions: {
              horseId: selectedHorseId,
              raceId: race.id,
              ridingStyle: "tactical",
              earlyPosition: "midpack",
              moveTiming: "mid",
              aggressiveness: 50,
            },
          },
          selectedHorseId,
          race.id,
        );
        setRaceTactics(race.id, selectedHorseId, instructions);

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
          toast.info(`${horse?.name ?? "Horse"} bumped a weaker entry to join ${race.name}.`);
        }

        onClose();
      } else {
        alert(res.reason);
      }
    }
  };

  return {
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
    jockeys,
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
  };
}
