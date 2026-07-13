import { useState, useEffect, useCallback, useMemo, type MouseEvent } from "react";
import { useGame, useGameWithShallow } from "@/game/store";
import { loadRaceHistoryLimit, saveRaceHistoryLimit } from "@/services/storage/storageAdapter";
import { getAffinityLevel, calculateTheHandBonus } from "@/core/jockey/affinity";
import { getPeakingBeyerMultiplier } from "@/core/health/banister";

export function useHorseDetail(horseId: string) {
  const trainHorse = useGame((s) => s.trainHorse);
  const consignHorse = useGame((s) => s.consignHorse);
  const withdrawConsignment = useGame((s) => s.withdrawConsignment);
  const trainingUsed = useGameWithShallow((s) => s.trainingUsed[horseId] ?? 0);
  const cash = useGame((s) => s.cash);
  const horses = useGame((s) => s.horses);

  const retireToStud = useGame((s) => s.retireToStud);
  const retireToPasture = useGame((s) => s.retireToPasture);
  const facilities = useGameWithShallow((s) => s.facilities);
  const pregnancies = useGameWithShallow((s) => s.pregnancies);
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
  const syndicates = useGameWithShallow((s) => s.syndicates || {});
  const races = useGameWithShallow((s) => s.races);
  const currentRace = Object.values(races ?? {}).find((r: any) =>
    r.entries.some((e: any) => e.horseId === horseId && !r.resolved),
  );
  const assignedJockeyId = currentRace?.entries.find((e: any) => e.horseId === horseId)?.jockeyId;
  const jockeys = useGameWithShallow((s) => s.jockeys);
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

    ["stats", "health", "training", "beyer", "genetics", "lineage", "projection", "history"].forEach((id) => {
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
      { id: "genetics", label: "Genetics" },
      { id: "lineage", label: "Heritage" },
      { id: "projection", label: "Projection" },
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

  const horse = horses[horseId];
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
    localHorseMap: new Map(Object.entries(horses)),
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
