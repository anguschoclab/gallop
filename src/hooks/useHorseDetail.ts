import { useState, useEffect, useCallback, useMemo, type MouseEvent } from "react";
import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import { loadRaceHistoryLimit, saveRaceHistoryLimit } from "@/services/storageAdapter";
import { getAffinityLevel, calculateTheHandBonus } from "@/core/jockey/affinity";
import { getPeakingBeyerMultiplier } from "@/core/health/banister";

export function useHorseDetail(horseId: string) {
  const trainHorse = useGame((s) => s.trainHorse);
  const consignHorse = useGame((s) => s.consignHorse);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const trainingUsed = (useGame as any)((s: any) => s.trainingUsed[horseId] ?? 0, shallow);
  const cash = useGame((s: any) => s.cash);
  const horses = useGame((s: any) => s.horses);

  const localHorseMap = useMemo(
    () => new Map<string, any>((horses ?? []).map((h: any) => [h.id, h])),
    [horses],
  );

  const retireToStud = useGame((s: any) => s.retireToStud);
  const retireToPasture = useGame((s: any) => s.retireToPasture);
  const facilities = (useGame as any)((s: any) => s.facilities, shallow);
  const pregnancies = (useGame as any)((s: any) => s.pregnancies, shallow);
  const pregnancy = pregnancies?.find((p: any) => !p.resolved && p.damId === horseId);

  const progenyPregnancies = useMemo(() => {
    if (!pregnancies) return [];
    return pregnancies.filter((p: any) => p.sireId === horseId || p.damId === horseId);
  }, [pregnancies, horseId]);

  const reBreedingPregnancies = useMemo(() => {
    if (!pregnancies) return [];
    return pregnancies.filter(
      (p: any) => p.damId === horseId && (p.liveFoalGuarantee || (p.reBreedingAttempts || 0) > 0),
    );
  }, [pregnancies, horseId]);

  const [raceHistoryLimit, setRaceHistoryLimit] = useState<number>(() => loadRaceHistoryLimit());
  const [syndicateDialogOpen, setSyndicateDialogOpen] = useState(false);
  const syndicates = (useGame as any)((s: any) => s.syndicates || {}, shallow);
  const races = (useGame as any)((s: any) => s.races, shallow);
  const currentRace = races?.find((r: any) =>
    r.entries.some((e: any) => e.horseId === horseId && !r.resolved),
  );
  const assignedJockeyId = currentRace?.entries.find((e: any) => e.horseId === horseId)?.jockeyId;
  const jockeys = (useGame as any)((s: any) => s.jockeys, shallow);
  const assignedJockey = jockeys?.find((j: any) => j.id === assignedJockeyId);

  const handleTrain = useCallback(
    (hId: string, type: any) => {
      trainHorse(hId, type);
    },
    [trainHorse],
  );

  const handleScrollToSection = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const sectionId = e.currentTarget.dataset.sectionId;
    if (sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    saveRaceHistoryLimit(raceHistoryLimit);
  }, [raceHistoryLimit]);

  const [activeSection, setActiveSection] = useState("stats");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.5 },
    );

    ["stats", "health", "training", "beyer", "lineage", "history"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const sections = useMemo(
    () => [
      { id: "stats", label: "Inventory" },
      { id: "health", label: "Condition" },
      { id: "training", label: "Training" },
      { id: "beyer", label: "Analytics" },
      { id: "lineage", label: "Heritage" },
      { id: "history", label: "Race History" },
    ],
    [],
  );

  const slotsLeft = 2 - trainingUsed;
  const isPregnant = !!pregnancy;

  const affinityBonus = assignedJockey ? calculateTheHandBonus(assignedJockey, horseId) : 0;
  const affinityLevel = assignedJockey
    ? getAffinityLevel(assignedJockey.affinityMap[horseId] || 0)
    : null;

  const isSyndicated = !!syndicates[horseId];

  const horse = localHorseMap.get(horseId);
  const peakingMultiplier = getPeakingBeyerMultiplier(horse?.peakingIndex ?? 0);
  const peakingStatus =
    (horse?.peakingIndex ?? 0) > 20
      ? "Peak"
      : (horse?.peakingIndex ?? 0) > 0
        ? "Good"
        : (horse?.peakingIndex ?? 0) > -10
          ? "Standard"
          : "Fatigued";
  const g1Wins =
    horse?.raceHistory?.filter((r: any) => r.grade === "G1" && r.position === 1).length || 0;

  return {
    trainHorse,
    consignHorse,
    withdrawConsignment,
    trainingUsed,
    cash,
    horses,
    localHorseMap,
    retireToStud,
    retireToPasture,
    facilities,
    pregnancies,
    pregnancy,
    progenyPregnancies,
    reBreedingPregnancies,
    raceHistoryLimit,
    setRaceHistoryLimit,
    syndicateDialogOpen,
    setSyndicateDialogOpen,
    syndicates,
    races,
    currentRace,
    assignedJockeyId,
    assignedJockey,
    jockeys,
    handleTrain,
    handleScrollToSection,
    activeSection,
    sections,
    slotsLeft,
    isPregnant,
    affinityBonus,
    affinityLevel,
    isSyndicated,
    peakingMultiplier,
    peakingStatus,
    g1Wins,
  };
}
