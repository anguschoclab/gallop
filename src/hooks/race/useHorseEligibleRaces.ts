import { useMemo } from "react";
import type { Horse, Race, Jockey, Stable } from "@/game/types";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { calculateRaceSuitability } from "@/core/race/entryScoring";
import { getTransportCostForRace } from "@/core/race/transportCost";

const PLAYER_STABLE_CONFIG: Stable = {
  id: "player",
  name: "Player Stable",
  owner: "Player",
  personality: "win-now",
  tier: "elite",
  cash: 0,
  horses: [],
  reputation: 50,
  founded: 1,
  isMajor: true,
  colors: { primary: "#D4AF37", secondary: "#C0C0C0" },
  staff: { trainer: null, veterinarian: null, farrier: null, nutritionist: null, groom: null },
  outposts: [],
};

export type EligibleRaceRow = {
  race: Race;
  suitabilityScore: number;
  entryFee: number;
  transportCost: number;
  estimatedJockeyFee: number;
  totalCost: number;
  isEntered: boolean;
  requiresDialog: boolean;
};

function estimateJockeyFee(horse: Horse, jockeys: Jockey[]): number {
  const retained = jockeys.find((j) => j.stableId === "player");
  if (retained) return retained.ridingFee;

  const freeAgents = jockeys.filter((j) => !j.stableId);
  if (freeAgents.length === 0) return 0;

  const matches = freeAgents.filter((j) => {
    if (horse.runningStyle === "E") return j.archetype === "front_runner";
    if (horse.runningStyle === "S") return j.archetype === "closer";
    return j.archetype === "versatile" || j.archetype === "clinical";
  });

  const pool = matches.length > 0 ? matches : freeAgents;
  return pool.sort((a, b) => b.fame - a.fame)[0]?.ridingFee ?? 0;
}

export function deriveEligibleRaces(
  horse: Horse | undefined,
  races: Race[],
  jockeys: Jockey[],
  cash: number,
  day: number,
  daysAhead: number = 30,
): EligibleRaceRow[] {
  if (!horse) return [];

  if (horse.energy < 50) return [];

  const upcoming = races.filter(
    (r) => !r.resolved && r.day > day && r.day <= day + daysAhead,
  );

  const rows: EligibleRaceRow[] = [];

  for (const race of upcoming) {
    if (!isHorseEligibleForRace(horse, race, new Set(), day)) continue;

    const score = calculateRaceSuitability(horse, race, PLAYER_STABLE_CONFIG);
    const transportCost = getTransportCostForRace(race);
    const jockeyFee = estimateJockeyFee(horse, jockeys);
    const totalCost = race.entryFee + jockeyFee + transportCost;
    const isEntered = race.entries.some((e) => e.horseId === horse.id);
    const requiresDialog = !!race.graded;

    rows.push({
      race,
      suitabilityScore: score,
      entryFee: race.entryFee,
      transportCost,
      estimatedJockeyFee: jockeyFee,
      totalCost,
      isEntered,
      requiresDialog,
    });
  }

  rows.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  return rows;
}

export function useHorseEligibleRaces(
  horse: Horse | undefined,
  races: Record<string, Race>,
  jockeys: Jockey[],
  cash: number,
  day: number,
  daysAhead: number = 30,
): EligibleRaceRow[] {
  const racesArray = useMemo(() => Object.values(races), [races]);
  return useMemo(
    () => deriveEligibleRaces(horse, racesArray, jockeys, cash, day, daysAhead),
    [horse, racesArray, jockeys, cash, day, daysAhead],
  );
}
