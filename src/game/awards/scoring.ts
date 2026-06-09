/**
 * awards/scoring.ts - Regional awards scoring engine
 *
 * This file calculates award points based on race performance for regional
 * awards (North America, Europe, Asia-Pacific, South America).
 *
 * Dependencies: ../types (Horse, Race), ./types (AwardRegion, RegionalAwardCategory, RegionalAward, REGIONAL_SCORING, COUNTRY_TO_REGION, NORTH_AMERICAN_CATEGORIES, EUROPEAN_CATEGORIES, ASIA_PACIFIC_CATEGORIES, SOUTH_AMERICAN_CATEGORIES), @/core/data/gradedRaces (getTrackContinent, Continent)
 * Related files: types.ts (award type definitions), index.ts (re-exports)
 */

// Regional Awards Scoring Engine
// Calculates award points based on race performance

import type { Horse, Race } from "../types";
import type { AwardRegion, RegionalAwardCategory, RegionalAward } from "./types";
import {
  REGIONAL_SCORING,
  COUNTRY_TO_REGION,
  NORTH_AMERICAN_CATEGORIES,
  EUROPEAN_CATEGORIES,
  ASIA_PACIFIC_CATEGORIES,
  SOUTH_AMERICAN_CATEGORIES,
} from "./types";
import { getTrackContinent, type Continent } from "@/data/gradedRaces";

// Map continent to award region
const CONTINENT_TO_REGION: Record<Continent, AwardRegion> = {
  north_america: "north_america",
  europe: "europe",
  asia_pacific: "asia_pacific",
  south_america: "south_america",
};

// Get eligible categories for a region
function getCategoriesForRegion(region: AwardRegion): readonly RegionalAwardCategory[] {
  switch (region) {
    case "north_america":
      return NORTH_AMERICAN_CATEGORIES;
    case "europe":
      return EUROPEAN_CATEGORIES;
    case "asia_pacific":
      return ASIA_PACIFIC_CATEGORIES;
    case "south_america":
      return SOUTH_AMERICAN_CATEGORIES;
    default:
      return [];
  }
}

// Calculate points for a single race result
function calculateRacePoints(
  historyEntry: Horse["raceHistory"][0],
  weights: (typeof REGIONAL_SCORING)[AwardRegion],
): number {
  let points = 0;

  // Win points based on grade
  if (historyEntry.position === 1) {
    if (historyEntry.grade === "G1") {
      points += weights.G1_WIN;
    } else if (historyEntry.grade === "G2") {
      points += weights.G2_WIN;
    } else if (historyEntry.grade === "G3") {
      points += weights.G3_WIN;
    } else if (historyEntry.grade) {
      points += weights.STAKES_WIN;
    }
  } else if (historyEntry.position && historyEntry.position <= 3 && historyEntry.grade) {
    // Placed in graded race
    points += weights.GRADED_PLACE;
  }

  // Beyer bonuses
  if (historyEntry.beyer) {
    if (historyEntry.beyer >= 110) {
      points += weights.BEYER_110_PLUS;
    } else if (historyEntry.beyer >= 100) {
      points += weights.BEYER_100_PLUS;
    }
  }

  return points;
}

// Check if horse is eligible for a category
function isEligibleForCategory(
  horse: Horse,
  category: RegionalAwardCategory,
  historyEntry: Horse["raceHistory"][0],
): boolean {
  const age = horse.age;
  const gender = horse.gender;
  const distance = historyEntry.distance || 0;
  const surface = historyEntry.surface?.toLowerCase() || "";

  switch (category) {
    // Horse of the Year - any horse eligible
    case "horse_of_the_year":
      return true;

    // Age-based categories
    case "champion_2yo_male":
    case "champion_2yo_colt":
      return age === 2 && (gender === "colt" || gender === "horse");
    case "champion_2yo_female":
    case "champion_2yo_filly":
      return age === 2 && (gender === "filly" || gender === "mare");
    case "champion_3yo_male":
    case "champion_3yo_colt":
    case "campeon_3yo_macho":
      return age === 3 && (gender === "colt" || gender === "horse");
    case "champion_3yo_female":
    case "champion_3yo_filly":
    case "campeona_3yo_hembras":
      return age === 3 && (gender === "filly" || gender === "mare");
    case "champion_2yo":
    case "potrillo_del_ano":
    case "potranca_del_ano":
      return age === 2;
    case "champion_3yo":
      return age === 3;

    // Older horse categories
    case "champion_older_dirt_male":
      return age >= 4 && (gender === "horse" || gender === "colt") && surface === "dirt";
    case "champion_older_dirt_female":
      return age >= 4 && (gender === "mare" || gender === "filly") && surface === "dirt";
    case "champion_older_horse":
    case "campeon_mayor":
      return age >= 4;

    // Sprint categories
    case "champion_sprint_male":
    case "champion_sprint_female":
    case "champion_sprinter_eu":
    case "champion_sprinter_apac":
    case "campeon_velocidad":
      return distance <= 1400;

    // Stayer categories
    case "champion_stayer":
    case "campeon_fondo":
      return distance >= 2400;

    // Turf categories
    case "champion_turf_male":
      return (gender === "horse" || gender === "colt") && surface === "turf";
    case "champion_turf_female":
      return (gender === "mare" || gender === "filly") && surface === "turf";

    // Middle distance
    case "champion_middle_distance":
      return distance >= 1400 && distance <= 2000;

    // Filly/Mare categories
    case "champion_filly_or_mare":
      return gender === "filly" || gender === "mare";

    // Steeplechase - longer distance turf races (heuristic until proper steeplechase type added)
    case "champion_steeplechase":
      // Steeplechase races are typically long-distance (3200m+) on turf
      return distance >= 3200 && surface === "turf";

    // Award of merit (special handling)
    case "award_of_merit":
      return false; // Handled separately

    // International/Trainer (not horse awards)
    case "champion_international":
    case "champion_trainer":
      return false;

    default:
      return true;
  }
}

/**
 * Calculate total points for a horse in a region's awards.
 *
 * Filters race history to relevant year and region, checks category eligibility,
 * and sums points based on race performance (grade wins, places, Beyer bonuses).
 *
 * @param horse - The horse to calculate points for
 * @param races - All races in the game
 * @param year - Award year
 * @param region - Award region
 * @param category - Award category
 * @returns Total points earned in this category
 */
export function calculateAwardPoints(
  horse: Horse,
  races: Race[],
  year: number,
  region: AwardRegion,
  category: RegionalAwardCategory,
): number {
  const weights = REGIONAL_SCORING[region];
  let totalPoints = 0;

  // Filter race history to relevant year and region
  const yearStart = (year - 1) * 365 + 1;
  const yearEnd = year * 365;

  for (const historyEntry of horse.raceHistory) {
    // Check if within award year
    if (historyEntry.day < yearStart || historyEntry.day > yearEnd) {
      continue;
    }

    // Check if race is in this region (by track)
    const race = races.find((r) => r.id === historyEntry.raceId);
    if (!race?.graded?.track) continue;

    const trackContinent = getTrackContinent(race.graded.track);
    const trackRegion = CONTINENT_TO_REGION[trackContinent];
    if (trackRegion !== region) continue;

    // Check category eligibility
    if (!isEligibleForCategory(horse, category, historyEntry)) {
      continue;
    }

    totalPoints += calculateRacePoints(historyEntry, weights);
  }

  return totalPoints;
}

/**
 * Determine winners for all awards in a region.
 *
 * Calculates points for all eligible horses in each category and selects
 * the highest-scoring horse as the winner.
 *
 * @param horses - All horses in the game
 * @param races - All races in the game
 * @param year - Award year
 * @param region - Award region
 * @returns Array of regional award winners without ID and ceremony day
 */
export function determineRegionalWinners(
  horses: Horse[],
  races: Race[],
  year: number,
  region: AwardRegion,
): Omit<RegionalAward, "id" | "ceremonyDay">[] {
  const categories = getCategoriesForRegion(region);
  const winners: Omit<RegionalAward, "id" | "ceremonyDay">[] = [];

  for (const category of categories) {
    // Skip merit/international categories for now
    if (
      category === "award_of_merit" ||
      category === "champion_international" ||
      category === "champion_trainer"
    ) {
      continue;
    }

    // Calculate points for all eligible horses
    const horsePoints: Array<{ horse: Horse; points: number }> = [];
    for (const horse of horses) {
      const points = calculateAwardPoints(horse, races, year, region, category);
      if (points > 0) {
        horsePoints.push({ horse, points });
      }
    }

    // Sort by points descending
    horsePoints.sort((a, b) => b.points - a.points);

    if (horsePoints.length > 0) {
      const winner = horsePoints[0];
      const runnerUp = horsePoints[1];

      winners.push({
        year,
        region,
        category,
        horseId: winner.horse.id,
        horseName: winner.horse.name,
        stableId: winner.horse.stableId,
        points: winner.points,
        runnerUpId: runnerUp?.horse.id,
        runnerUpPoints: runnerUp?.points || 0,
        margin: runnerUp ? winner.points - runnerUp.points : winner.points,
        qualifyingRaces: winner.horse.raceHistory
          .filter((h) => h.grade && h.day >= (year - 1) * 365 + 1 && h.day <= year * 365)
          .map((h) => h.raceId),
      });
    }
  }

  return winners;
}

/**
 * Determine winners for all regions.
 *
 * Aggregates regional winners from North America, Europe, Asia-Pacific,
 * and South America into a single array.
 *
 * @param horses - All horses in the game
 * @param races - All races in the game
 * @param year - Award year
 * @returns Array of all regional award winners without ID and ceremony day
 */
export function determineAllRegionalWinners(
  horses: Horse[],
  races: Race[],
  year: number,
): Omit<RegionalAward, "id" | "ceremonyDay">[] {
  const regions: AwardRegion[] = ["north_america", "europe", "asia_pacific", "south_america"];
  let allWinners: Omit<RegionalAward, "id" | "ceremonyDay">[] = [];

  for (const region of regions) {
    const regionalWinners = determineRegionalWinners(horses, races, year, region);
    allWinners = allWinners.concat(regionalWinners);
  }

  return allWinners;
}
