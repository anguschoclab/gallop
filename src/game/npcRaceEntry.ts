// AI Race Entry System - NPC stables intelligently enter horses in races
// Evaluates races 1-3 days ahead and enters eligible, competitive horses

import type { Horse, Race, Stable, StableTier, Jockey } from "./types";
import type { Rng } from "./rng";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { calculateOverallRating } from "@/core/horse/stats";
import { PERSONALITY_CONFIG } from "./npcStables";
import { isHorseEligibleForClaimingPrice, getSuggestedClaimingPriceRange } from "./claiming";

// Entry limits per stable per race
const MAX_HORSES_PER_STABLE_PER_RACE = 2;

// Energy threshold for entering races
const MIN_ENERGY_TO_ENTER = 50;

// Form consideration - prefer positive form
const MIN_FORM_TO_ENTER = -3;

// Distance preference - horses prefer races within this range of their "best" distance
const PREFERRED_DISTANCE_RANGE = 300; // ±300m from ideal

// Base purse appeal thresholds by tier (modified by personality)
const BASE_PURSE_APPEAL: Record<StableTier, number> = {
  elite: 100000,
  mid: 25000,
  budget: 5000,
};

/**
 * Calculate horse's suitability score for a race
 * Higher score = better match
 * Personality affects scoring significantly
 */
function calculateRaceSuitability(horse: Horse, race: Race, stable: Stable): number {
  const personality = PERSONALITY_CONFIG[stable.personality];
  let score = 0;
  const overall = calculateOverallRating(horse);
  
  // Class match - affected by risk tolerance
  if (race.minStat) {
    const gap = overall - race.minStat;
    const riskTolerance = personality.riskTolerance;
    if (gap >= -5 && gap <= 10) {
      score += 30;
    } else if (gap > 10) {
      score += (20 - gap) * riskTolerance; // Risk-takers still enter overqualified
    } else {
      score += gap * riskTolerance; // Risk-takers may enter underqualified
    }
  } else {
    score += 20;
  }
  
  // Distance fit - use horse's personal aptitude
  const distDiff = Math.abs(race.distance - horse.distanceAptitude);
  if (distDiff <= 100) score += 30;
  else if (distDiff <= 300) score += 15;
  else if (distDiff <= 600) score += 5;
  else score -= 15;
  
  // Surface fit - use horse's personal aptitude
  const surface = race.surface || race.graded?.surface;
  if (surface) {
    const apt = horse.surfaceAptitude[surface] ?? 0.95;
    if (apt >= 1.0) score += 20;
    else if (apt >= 0.95) score += 5;
    else score -= 20;
  }

  // --- Track Geometry Match ---
  // Large tracks (large radii, long straights) vs Tight tracks (small radii, short straights)
  const trackId = race.graded?.trackId || race.trackId;
  const course = race.graded ? { 
    sections: [], 
    straightLength: race.distance > 2000 ? 500 : 350 // Fallback if no course data
  } : null; // In real use, we'd look up the track JSON here.

  // For this logic, we'll assume the sim has already resolved the course
  // If we can't find exact radii, we check the straightLength as a proxy for "Galloping" vs "Tight"
  const straight = race.graded ? 400 : 350; // Simplified for AI heuristic
  if (straight > 450) {
    // Galloping track: favors speed and long-striding horses
    if (horse.stats.speed > 70) score += 15;
    if (horse.corneringAptitude < 0.95) score += 10; // "Lumbering" speedsters are OK here
  } else if (straight < 350) {
    // Tight "Bullring": favors agility and cornering
    if (horse.corneringAptitude > 1.05) score += 20;
    if (horse.stats.acceleration > 70) score += 15;
    if (horse.corneringAptitude < 0.9) score -= 25; // Don't enter bad cornerers here
  }

  // --- Gradient Match ---
  // If the race is at a known hilly track, check climbing aptitude
  const isHilly = race.graded?.track.toLowerCase().includes("nakayama") || race.graded?.track.toLowerCase().includes("ascot");
  if (isHilly) {
    if (horse.climbingAptitude > 1.05) score += 20;
    if (horse.climbingAptitude < 0.95) score -= 20;
  }
  
  // Purse appeal - modified by personality
  const baseAppeal = BASE_PURSE_APPEAL[stable.tier] || 10000;
  const purseThreshold = baseAppeal * personality.purseThresholdMod;
  if (race.purse >= purseThreshold * 2) {
    score += 25 * personality.raceEntryMod;
  } else if (race.purse >= purseThreshold) {
    score += 15 * personality.raceEntryMod;
  } else if (race.purse >= purseThreshold * 0.5) {
    score += 5 * personality.raceEntryMod;
  }
  
  // Youth preference - developers like young horses, win-now likes proven
  if (horse.age <= 3 && personality.youthPreference > 0.7) {
    score += 10; // Bonus for young horses with developer personality
  } else if (horse.age >= 5 && personality.youthPreference < 0.3) {
    score += 10; // Bonus for proven horses with win-now personality
  }
  
  // Form bonus/penalty - aggressive stables ignore form more
  const formTolerance = personality.riskTolerance;
  if (horse.form > 3) {
    score += 10;
  } else if (horse.form < -3) {
    score -= 10 * (2 - formTolerance); // Conservative stables penalize bad form more
  }
  
  // Energy check
  if (horse.energy > 80) {
    score += 5;
  } else if (horse.energy < MIN_ENERGY_TO_ENTER) {
    score -= 20;
  }
  
  // Fame/recognition - prestige stables love famous horses in big races
  if (horse.fame > 50 && race.purse > 100000) {
    score += 10 * (personality.gradedRaceBonus / 20);
  }
  
  // Graded race bonus - heavily modified by personality
  if (race.graded?.grade === "G1") {
    score += 15 + (personality.gradedRaceBonus * 0.5);
  } else if (race.graded?.grade === "G2") {
    score += 10 + (personality.gradedRaceBonus * 0.3);
  } else if (race.graded?.grade === "G3") {
    score += 5 + (personality.gradedRaceBonus * 0.2);
  }

  // Claiming race logic - trader personality loves claiming races
  if (race.claimingPrice) {
    if (stable.personality === "trader") {
      score += 20; // Traders actively seek claiming opportunities
    } else {
      score -= 5; // Other personalities avoid claiming risk
    }

    // Check if horse is appropriately priced for claiming level
    const isEligible = isHorseEligibleForClaimingPrice(horse, race.claimingPrice, []);
    if (!isEligible) {
      score -= 30; // Heavy penalty for over-qualified horses
    } else {
      // Bonus for well-matched claiming prices
      const [minPrice, maxPrice] = getSuggestedClaimingPriceRange(horse);
      if (race.claimingPrice >= minPrice && race.claimingPrice <= maxPrice) {
        score += 10;
      }
    }
  }

  // Optional claiming - good middle ground
  if (race.raceClass === "OptionalClaiming") {
    score += 5; // Slight bonus for flexibility
  }

  // Starter allowance/starter handicap - good for horses moving up
  if (race.raceClass === "StarterAllowance" || race.raceClass === "StarterHandicap") {
    // Check if horse has claiming race history
    const hasClaimingHistory = horse.raceHistory.some(r => r.purse && r.purse < 10000);
    if (hasClaimingHistory) {
      score += 15; // Bonus for horses trying to move up from claiming company
    }
  }

  return score;
}

/**
 * Calculate the assigned weight for a horse in a specific race.
 * Includes Sex Allowance (females carry less) and Weight-for-Age (younger horses carry less).
 */
export function calculateAssignedWeight(horse: Horse, race: Race): number {
  // Base weight for major races is 126 lbs (57kg)
  let weight = 126;

  // Sex Allowance: Fillies and Mares carry 3-5 lbs less in mixed races
  const isMixedRace = !race.restrictions?.gender || 
    (!race.restrictions.gender.toLowerCase().includes("filly") && 
     !race.restrictions.gender.toLowerCase().includes("mare") &&
     !race.restrictions.gender.toLowerCase().includes("colt"));

  if (isMixedRace && (horse.gender === "filly" || horse.gender === "mare")) {
    weight -= 3; // 3 lb sex allowance
  }

  // Weight-for-Age: 3yos carry less than older horses in open races
  if (horse.age === 3 && (race.restrictions?.minAge === undefined || race.restrictions.minAge < 3)) {
    weight -= 2; // 2 lb age allowance
  }

  // Handicap adjustment (if applicable)
  if (race.isHandicap && race.handicapWeights) {
    const hw = race.handicapWeights.find(w => w.horseId === horse.id);
    if (hw) return hw.weight;
  }

  return weight;
}

/**
 * Check if a horse should enter a race (basic eligibility + suitability)
 */
function shouldEnterHorse(
  horse: Horse,
  race: Race,
  currentEntries: Race["entries"],
  pregnantIds: Set<string>,
  stable: Stable
): { shouldEnter: boolean; score: number } {
  // Basic eligibility check
  if (!isHorseEligibleForRace(horse, race, pregnantIds)) {
    return { shouldEnter: false, score: 0 };
  }
  
  // Energy check
  if (horse.energy < MIN_ENERGY_TO_ENTER) {
    return { shouldEnter: false, score: 0 };
  }
  
  // Form check - avoid very cold horses
  // Note: personality affects this in calculateRaceSuitability
  const personality = PERSONALITY_CONFIG[stable.personality];
  const minForm = MIN_FORM_TO_ENTER * (2 - personality.riskTolerance);
  if (horse.form < minForm) {
    return { shouldEnter: false, score: 0 };
  }
  
  // Check stable hasn't maxed out entries in this race
  const stableEntries = currentEntries.filter(e => e.stableId === horse.stableId).length;
  if (stableEntries >= MAX_HORSES_PER_STABLE_PER_RACE) {
    return { shouldEnter: false, score: 0 };
  }
  
  // Check horse not already entered
  if (currentEntries.some(e => e.horseId === horse.id)) {
    return { shouldEnter: false, score: 0 };
  }
  
  // Calculate suitability score with personality
  const score = calculateRaceSuitability(horse, race, stable);
  
  // Minimum score threshold to enter - modified by raceEntryMod
  // Aggressive stables enter with lower scores
  const minScore = 0 * personality.raceEntryMod;
  if (score < minScore) {
    return { shouldEnter: false, score };
  }
  
  return { shouldEnter: true, score };
}

/**
 * AI decision: Enter horses from a stable into a specific race
 * Returns array of horses to enter
 */
export function selectHorsesForRaceEntry(
  stable: Stable,
  horses: Horse[],
  race: Race,
  pregnantIds: Set<string>
): Horse[] {
  const candidates: { horse: Horse; score: number }[] = [];
  
  // Find all eligible horses
  for (const horseId of stable.horses) {
    const horse = horses.find(h => h.id === horseId);
    if (!horse) continue;
    
    const { shouldEnter, score } = shouldEnterHorse(horse, race, race.entries, pregnantIds, stable);
    if (shouldEnter) {
      candidates.push({ horse, score });
    }
  }
  
  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  
  // Select top candidates up to max per race
  const toEnter: Horse[] = [];
  for (const { horse } of candidates.slice(0, MAX_HORSES_PER_STABLE_PER_RACE)) {
    toEnter.push(horse);
  }
  
  return toEnter;
}

/**
 * Run race entry for all NPC stables for races in the next N days
 * This is called during advanceDay()
 */
export function runNpcRaceEntry(
  stables: Stable[],
  horses: Horse[],
  jockeys: Jockey[],
  races: Race[],
  currentDay: number,
  rng: Rng,
  daysAhead: number = 3,
  pregnantIds: Set<string> = new Set()
): Race[] {
  const updatedRaces = [...races];
  
  // Look at races in the next daysAhead days
  const upcomingRaces = updatedRaces.filter(
    r => r.day > currentDay && r.day <= currentDay + daysAhead && !r.resolved
  );
  
  for (const race of upcomingRaces) {
    // Skip if race is full
    if (race.entries.length >= race.fieldSize) continue;
    
    // Each stable evaluates this race
    for (const stable of stables) {
      // Skip if stable has no horses
      if (stable.horses.length === 0) continue;
      
      // Select horses to enter
      const horsesToEnter = selectHorsesForRaceEntry(stable, horses, race, pregnantIds);
      
      // Add entries
      for (const horse of horsesToEnter) {
        // Double-check there's still room
        if (race.entries.length >= race.fieldSize) break;
        
        // Find a jockey for the NPC entry
        const retainedJockey = jockeys.find(j => j.stableId === stable.id);
        let jockeyId: string | undefined = retainedJockey?.id;
        
        if (!jockeyId) {
          // Find best available freelance jockey whose archetype matches horse style
          const freeAgents = jockeys.filter(j => !j.stableId && j.lastRaceDay !== currentDay);
          if (freeAgents.length > 0) {
            const matches = freeAgents.filter(j => {
              if (horse.runningStyle === "E") return j.archetype === "front_runner";
              if (horse.runningStyle === "S") return j.archetype === "closer";
              return j.archetype === "versatile" || j.archetype === "clinical";
            });
            const pool = matches.length > 0 ? matches : freeAgents;
            // Pick based on fame/tier
            pool.sort((a, b) => b.fame - a.fame);
            const chosen = pool[0];
            jockeyId = chosen.id;
            chosen.lastRaceDay = currentDay;
          }
        }

        const jockey = jockeys.find(j => j.id === jockeyId);
        const ridingFee = jockey?.ridingFee ?? 100;

        const jockey = jockeys.find(j => j.id === jockeyId);
        const ridingFee = jockey?.ridingFee ?? 100;
        const assignedWeight = calculateAssignedWeight(horse, race);

        race.entries.push({
          horseId: horse.id,
          owned: false,
          stableId: stable.id,
          npc: true,
          jockeyId,
          weight: assignedWeight
        });
        
        // Deduct entry fee AND riding fee from stable
        stable.cash = Math.max(0, stable.cash - race.entryFee - ridingFee);
      }
    }
  }
  
  return updatedRaces;
}

/**
 * Fill remaining race spots with filler horses
 * Called when building race field if pre-entries don't fill the race
 */
export function fillRaceWithFillerHorses(
  race: Race,
  stables: Stable[],
  horses: Horse[],
  needed: number
): { updatedRace: Race; newHorses: Horse[] } {
  const updatedRace = { ...race };
  const newHorses: Horse[] = [];
  
  // Get filler stables (non-major)
  const fillerStables = stables.filter(s => !s.isMajor);
  
  // Find eligible filler horses already in the system
  const eligibleFillerHorses = horses.filter(h => 
    h.stableId && 
    !h.owned &&
    !race.entries.some(e => e.horseId === h.id) &&
    h.energy > 40
  );
  
  // Use existing horses first
  for (const horse of eligibleFillerHorses.slice(0, needed)) {
    if (updatedRace.entries.length >= updatedRace.fieldSize) break;
    
    updatedRace.entries.push({
      horseId: horse.id,
      owned: false,
      stableId: horse.stableId,
      npc: true
    });
  }
  
  return { updatedRace, newHorses };
}

/**
 * AI Training - NPC stables train their horses
 * Called during advanceDay()
 */
export function runNpcTraining(
  stables: Stable[],
  horses: Horse[],
  currentDay: number,
  rng: Rng
): Horse[] {
  const updatedHorses = [...horses];
  
  for (const stable of stables) {
    // Training budget and slots vary by tier
    const trainingSlots = stable.tier === "elite" ? 8 : stable.tier === "mid" ? 5 : 3;
    let slotsUsed = 0;
    
    for (const horseId of stable.horses) {
      if (slotsUsed >= trainingSlots) break;
      
      const horseIndex = updatedHorses.findIndex(h => h.id === horseId);
      if (horseIndex === -1) continue;
      
      const horse = updatedHorses[horseIndex];
      
      // Skip if horse has been racing recently or low energy
      if (horse.energy < 40) continue;
      
      // Elite stables train more intelligently
      if (stable.tier === "elite") {
        // Focus on stats below potential
        const stats = horse.stats;
        const gaps = {
          speed: horse.potential - stats.speed,
          stamina: horse.potential - stats.stamina,
          acceleration: horse.potential - stats.acceleration,
          consistency: horse.potential - stats.consistency
        };
        
        // Train the biggest gap
        const toTrain = Object.entries(gaps)
          .filter(([_, gap]) => gap > 0)
          .sort((a, b) => b[1] - a[1])[0];
        
        if (toTrain && toTrain[1] > 0) {
          const stat = toTrain[0] as keyof typeof stats;
          const gain = rng.next() < 0.65 ? 1 : 0;
          if (gain > 0) {
            updatedHorses[horseIndex] = {
              ...horse,
              stats: {
                ...stats,
                [stat]: Math.min(horse.potential, stats[stat] + gain)
              },
              energy: Math.max(0, horse.energy - 18)
            };
          }
        }
      } else {
        // Lower tiers train more randomly
        if (rng.next() < 0.4) {
          const stat = rng.pick(["speed", "stamina", "acceleration"]) as keyof typeof horse.stats;
          updatedHorses[horseIndex] = {
            ...horse,
            stats: {
              ...horse.stats,
              [stat]: Math.min(horse.potential, horse.stats[stat] + 1)
            },
            energy: Math.max(0, horse.energy - 15)
          };
        }
      }
      
      slotsUsed++;
    }
  }
  
  return updatedHorses;
}

/**
 * Update horse fame after race results
 */
export function updateHorseFame(
  horses: Horse[],
  race: Race
): Horse[] {
  const updatedHorses = [...horses];
  
  if (!race.result) return updatedHorses;
  
  for (const result of race.result) {
    const horseIndex = updatedHorses.findIndex(h => h.id === result.horseId);
    if (horseIndex === -1) continue;
    
    const horse = updatedHorses[horseIndex];
    let fameGain = 0;
    
    // Fame gains based on result
    if (result.position === 1) {
      fameGain = race.graded?.grade === "G1" ? 20 : race.graded?.grade === "G2" ? 15 : race.graded?.grade === "G3" ? 10 : 5;
    } else if (result.position <= 3) {
      fameGain = race.graded?.grade === "G1" ? 10 : race.graded?.grade === "G2" ? 8 : race.graded?.grade === "G3" ? 5 : 2;
    } else if (result.position <= 5) {
      fameGain = 1;
    }
    
    // Big purse races give bonus fame
    if (race.purse > 500000) {
      fameGain += 3;
    } else if (race.purse > 100000) {
      fameGain += 1;
    }
    
    updatedHorses[horseIndex] = {
      ...horse,
      fame: Math.min(100, horse.fame + fameGain)
    };
  }
  
  return updatedHorses;
}
