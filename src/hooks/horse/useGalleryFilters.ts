import { useState, useMemo } from "react";
import { shallow } from "zustand/shallow";
import { useGame, useGameWithShallow } from "@/game/store";
import { calculateOverallRating } from "@/core/horse/stats";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import type { Horse } from "@/core/horse/types";

export const COAT_COLORS = [
  { value: "all", label: "All Coats" },
  { value: "bay", label: "Bay" },
  { value: "black", label: "Black" },
  { value: "chestnut", label: "Chestnut" },
  { value: "dark-bay", label: "Dark Bay" },
  { value: "gray", label: "Gray" },
  { value: "roan", label: "Roan" },
  { value: "palomino", label: "Palomino" },
  { value: "white", label: "White" },
  { value: "buckskin", label: "Buckskin" },
  { value: "seal-brown", label: "Seal Brown" },
  { value: "liver-chestnut", label: "Liver Chestnut" },
  { value: "dun", label: "Dun" },
  { value: "grulla", label: "Grulla" },
  { value: "champagne", label: "Champagne" },
] as const;

export function useGalleryFilters() {
  const allHorses = useGameWithShallow((s) => s.horses);
  const horses = useMemo(
    () =>
      Object.values(allHorses)
        .filter((h: Horse) => h.owned)
        .map(ensurePhenotypeResolved),
    [allHorses],
  );
  const [coatFilter, setCoatFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"ovr" | "age" | "name">("ovr");

  const filteredHorses = useMemo(() => {
    let result = [...horses];

    if (coatFilter !== "all") {
      result = result.filter((h) => h.coatColor === coatFilter);
    }

    result.sort((a, b) => {
      if (sortBy === "ovr") {
        return calculateOverallRating(b) - calculateOverallRating(a);
      }
      if (sortBy === "age") {
        return a.age - b.age;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [horses, coatFilter, sortBy]);

  const coatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    horses.forEach((h: Horse) => {
      if (h.coatColor) {
        counts[h.coatColor] = (counts[h.coatColor] || 0) + 1;
      }
    });
    return counts;
  }, [horses]);

  return {
    horses,
    coatFilter,
    setCoatFilter,
    sortBy,
    setSortBy,
    filteredHorses,
    coatCounts,
  };
}
