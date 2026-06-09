import { useMemo, useState } from "react";
import type { Race } from "@/game/types";
import type { Grade } from "@/data/gradedRaces";
import { getCountry } from "@/data/gradedRaces";

export type GradeFilter = "all" | Grade;
export type CountryFilter = "all" | string;
export type TrackFilter = "all" | string;
export type DistanceFilter = "all" | "sprint" | "mile" | "classic" | "stayer";

export const GRADE_OPTIONS: GradeFilter[] = ["all", "G1", "G2", "G3"];

export const DISTANCE_OPTIONS: { value: DistanceFilter; label: string; min?: number; max?: number }[] = [
  { value: "all", label: "All distances" },
  { value: "sprint", label: "Sprint (< 1400m)", max: 1399 },
  { value: "mile", label: "Mile (1400-1800m)", min: 1400, max: 1800 },
  { value: "classic", label: "Classic (1801-2400m)", min: 1801, max: 2400 },
  { value: "stayer", label: "Stayer (> 2400m)", min: 2401 },
];

const gradeLabel: Record<GradeFilter, string> = {
  all: "All grades",
  G1: "G1 only",
  G2: "G2 only",
  G3: "G3 only",
};

export function useRaceBrowserFilters(races: Race[]) {
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>("all");
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");

  const gradedRaces = useMemo(() => races.filter((r) => r.graded), [races]);

  const allCountries = useMemo(() => {
    return Array.from(
      new Set(gradedRaces.map((r) => getCountry(r.graded!.track))),
    ).sort();
  }, [gradedRaces]);

  const allTracks = useMemo(() => {
    return Array.from(new Set(gradedRaces.map((r) => r.graded!.track)))
      .filter(Boolean)
      .sort();
  }, [gradedRaces]);

  const filteredRaces = useMemo(() => {
    return gradedRaces.filter((race) => {
      if (gradeFilter !== "all" && race.graded!.grade !== gradeFilter) return false;
      if (countryFilter !== "all" && getCountry(race.graded!.track) !== countryFilter) return false;
      if (trackFilter !== "all" && race.graded!.track !== trackFilter) return false;

      const distanceOption = DISTANCE_OPTIONS.find((opt) => opt.value === distanceFilter);
      if (distanceOption && distanceFilter !== "all") {
        if (distanceOption.min !== undefined && race.distance < distanceOption.min) return false;
        if (distanceOption.max !== undefined && race.distance > distanceOption.max) return false;
      }

      return true;
    });
  }, [gradedRaces, gradeFilter, countryFilter, trackFilter, distanceFilter]);

  const reset = () => {
    setGradeFilter("all");
    setCountryFilter("all");
    setTrackFilter("all");
    setDistanceFilter("all");
  };

  const distanceLabel =
    DISTANCE_OPTIONS.find((opt) => opt.value === distanceFilter)?.label || "All distances";

  return {
    gradeFilter,
    setGradeFilter,
    countryFilter,
    setCountryFilter,
    trackFilter,
    setTrackFilter,
    distanceFilter,
    setDistanceFilter,
    allCountries,
    allTracks,
    filteredRaces,
    reset,
    gradeLabel,
    distanceLabel,
  };
}
