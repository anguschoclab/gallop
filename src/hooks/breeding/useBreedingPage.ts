import { useState, useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState, Horse } from "@/game/types";
import type { Pregnancy } from "@/core/breeding/types";
import { inBreedingSeason, nextBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { isFemaleHorse } from "@/core/horse/gender";
import { getAvailableStallions } from "@/core/breeding/stallions";
import { useBreedingCompatibility } from "@/hooks/breeding/useBreedingCompatibility";
import { getAncestorIds } from "@/core/breeding/pedigreeGraph";

export function useBreedingPage() {
  const horses = useGameWithShallow((s: GameState) => s.horses || []);
  const pregnancies = useGameWithShallow((s: GameState) => s.pregnancies || []);
  const log = useGameWithShallow((s: GameState) => s.log || []);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const breed = useGame((s) => s.breed);

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
  };
}
