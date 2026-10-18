import { useState, useMemo } from "react";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import { usePregnancies } from "@/platform/game/hooks/useBreedingState";
import type { GameState, Horse } from "@/platform/game/types";
import type { Pregnancy } from "@/domains/breeding/model/types";
import { inBreedingSeason, nextBreedingSeasonStart } from "@/domains/calendar/simulation/breedingCalendar";
import { isFemaleHorse } from "@/domains/horse/simulation/gender";
import { getAvailableStallions } from "@/domains/breeding/simulation/stallions";
import { useBreedingCompatibility } from "@/domains/breeding/application/hooks/useBreedingCompatibility";
import { getAncestorIds } from "@/domains/breeding/simulation/pedigreeGraph";

export function useBreedingPage() {
  const horses = useGameWithShallow((s: GameState) => s.horses || []);
  const pregnancies = usePregnancies();
  const log = useGameWithShallow((s: GameState) => s.log || []);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const breed = useGame((s) => s.breed);
  const savedMatingPlans = useGameWithShallow((s: GameState) => s.savedMatingPlans || []);

  const [sireId, setSireId] = useState<string>("");
  const [damId, setDamId] = useState<string>("");
  const [liveFoalGuarantee, setLiveFoalGuarantee] = useState(false);
  const [namingFoalId, setNamingFoalId] = useState<string | null>(null);

  const localHorseMap = useMemo(() => new Map<string, Horse>(Object.entries(horses)), [horses]);

  const { sire, dam, compatibility } = useBreedingCompatibility(sireId, damId);

  const sharedAncestorIds = useMemo(() => {
    if (!sireId || !damId) return undefined;
    const sireAncestors = getAncestorIds(sireId, localHorseMap, 3);
    const damAncestors = getAncestorIds(damId, localHorseMap, 3);
    const shared = new Set<string>();
    for (const id of sireAncestors) {
      if (damAncestors.has(id)) shared.add(id);
    }
    return shared.size > 0 ? shared : undefined;
  }, [sireId, damId, localHorseMap]);

  const adults = Object.values(horses).filter((h: Horse) => h.age >= 3);
  const breedLogs = log.filter((l: { day: number; text: string }) => /Mated|Foal/.test(l.text));
  const selectedMare = localHorseMap.get(damId);
  const availableStallions = getAvailableStallions(Object.values(horses), selectedMare);

  const seasonOpen = inBreedingSeason(day, "Northern");
  const nextSeasonStart = nextBreedingSeasonStart(day, "Northern");

  const activePregnancies = pregnancies.filter((p: Pregnancy) => !p.resolved);
  const activePregnanciesCount = activePregnancies.length;

  const femalesToBreed = adults.filter((h: Horse) => isFemaleHorse(h.gender) && h.id !== sireId);

  return {
    horses,
    pregnancies,
    log,
    day,
    cash,
    sireId,
    setSireId,
    damId,
    setDamId,
    liveFoalGuarantee,
    setLiveFoalGuarantee,
    namingFoalId,
    setNamingFoalId,
    localHorseMap,
    sire,
    dam,
    compatibility,
    sharedAncestorIds,
    adults,
    breedLogs,
    availableStallions,
    seasonOpen,
    nextSeasonStart,
    activePregnancies,
    activePregnanciesCount,
    breed,
    femalesToBreed,
    savedMatingPlans,
  };
}
