// NPC Intent Generators
// Generates intents for NPC stables during the intent collection phase

import type { AnyIntent, TrainingIntent, RaceEntryIntent, BreedingIntent, AuctionBidIntent, ClaimingIntent, WithdrawFromClaimingIntent } from "@/core/resolver/intents";
import type { GameState, Horse, Race, Stable } from "@/game/types";
import { generateUUID } from "@/game/uuid";
import { PERSONALITY_CONFIG } from "@/game/npcStables";
import { isHorseEligibleForClaimingPrice } from "@/game/claiming";
import { calculateOverallRating } from "@/core/horse/stats";

/**
 * Generate all NPC intents for the day
 */
export function generateNpcIntents(state: GameState, day: number): AnyIntent[] {
  const intents: AnyIntent[] = [];

  // Generate training intents for each NPC stable
  for (const stable of state.npcStables) {
    intents.push(...generateNpcTrainingIntents(state, stable, day));
    intents.push(...generateNpcRaceEntryIntents(state, stable, day));
    intents.push(...generateNpcBreedingIntents(state, stable, day));
    intents.push(...generateNpcAuctionBidIntents(state, stable, day));
    intents.push(...generateNpcClaimingIntents(state, stable, day));
  }

  return intents;
}

/**
 * Generate training intents for an NPC stable
 */
function generateNpcTrainingIntents(state: GameState, stable: Stable, day: number): TrainingIntent[] {
  const intents: TrainingIntent[] = [];
  const ownedHorses = state.horses.filter((h) => h.stableId === stable.id);

  for (const horse of ownedHorses) {
    // Simple logic: train if horse has energy and is not pregnant
    if (horse.energy >= 15 && !state.pregnancies.some((p) => !p.resolved && p.damId === horse.id)) {
      // Randomly choose training type based on horse's lowest stat
      const stats = horse.stats;
      const lowestStat = Object.entries(stats).reduce((a, b) => a[1] < b[1] ? a : b)[0] as "speed" | "stamina" | "acceleration";

      intents.push({
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 50, // NPC intents have lower priority than player
        type: "training",
        horseId: horse.id,
        trainingType: lowestStat,
      });
    }
  }

  return intents;
}

/**
 * Generate race entry intents for an NPC stable
 */
function generateNpcRaceEntryIntents(state: GameState, stable: Stable, day: number): RaceEntryIntent[] {
  const intents: RaceEntryIntent[] = [];
  const ownedHorses = state.horses.filter((h) => h.stableId === stable.id);
  const upcomingRaces = state.races.filter((r) => !r.resolved && r.day >= day && r.day <= day + 7);

  for (const race of upcomingRaces) {
    for (const horse of ownedHorses) {
      // Simple logic: enter if horse is eligible and has energy
      if (horse.energy >= 40 && !race.entries.some((e) => e.horseId === horse.id)) {
        if (race.entries.length < race.fieldSize) {
          intents.push({
            id: generateUUID(),
            entityId: race.id,
            source: "npc",
            sourceId: stable.id,
            day,
            priority: 50,
            type: "race_entry",
            raceId: race.id,
            horseId: horse.id,
          });
        }
      }
    }
  }

  return intents;
}

/**
 * Generate breeding intents for an NPC stable
 */
function generateNpcBreedingIntents(state: GameState, stable: Stable, day: number): BreedingIntent[] {
  const intents: BreedingIntent[] = [];
  const ownedHorses = state.horses.filter((h) => h.stableId === stable.id);

  // Find eligible mares and stallions
  const mares = ownedHorses.filter((h) => h.gender === "mare" && h.age >= 3 && h.age <= 15);
  const stallions = ownedHorses.filter((h) => (h.gender === "horse" || h.gender === "gelding") && h.stud?.atStud);

  for (const mare of mares) {
    // Skip if already pregnant
    if (state.pregnancies.some((p) => !p.resolved && p.damId === mare.id)) continue;

    for (const stallion of stallions) {
      // Simple logic: breed if stable has cash and stallion has bookings available
      if (stable.cash >= 2000 && stallion.stud && stallion.stud.seasonBookings < stallion.stud.bookSize) {
        intents.push({
          id: generateUUID(),
          entityId: mare.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 50,
          type: "breeding",
          sireId: stallion.id,
          damId: mare.id,
          liveFoalGuarantee: false,
        });
        break; // One breeding per mare per day
      }
    }
  }

  return intents;
}

/**
 * Generate auction bid intents for an NPC stable
 */
function generateNpcAuctionBidIntents(state: GameState, stable: Stable, day: number): AuctionBidIntent[] {
  const intents: AuctionBidIntent[] = [];

  if (!state.auctions) return intents;

  for (const auction of state.auctions) {
    if (auction.resolved) continue;

    for (const lot of auction.lots) {
      if (lot.passed || lot.withdrawn) continue;

      const horse = state.horses.find((h) => h.id === lot.horseId);
      if (!horse) continue;

      // Simple logic: bid if horse is affordable and stable has cash
      const maxBid = Math.min(stable.cash * 0.2, lot.reservePrice * 1.5);
      if (maxBid > lot.reservePrice && stable.cash >= maxBid) {
        intents.push({
          id: generateUUID(),
          entityId: lot.id,
          source: "npc",
          sourceId: stable.id,
          day,
          priority: 50,
          type: "auction_bid",
          saleId: auction.id,
          lotId: lot.id,
          amount: Math.floor(maxBid),
        });
      }
    }
  }

  return intents;
}

/**
 * Generate claiming intents for an NPC stable
 */
function generateNpcClaimingIntents(state: GameState, stable: Stable, day: number): ClaimingIntent[] {
  const intents: ClaimingIntent[] = [];
  const personality = PERSONALITY_CONFIG[stable.personality];
  const upcomingRaces = state.races.filter((r) => !r.resolved && r.day >= day && r.day <= day + 7);
  
  for (const race of upcomingRaces) {
    // Skip if not a claiming race
    if (!race.claimingPrice) continue;
    
    // Personality-based claiming propensity
    const claimingPropensity = personality.raceEntryMod * 
      (stable.personality === "trader" ? 1.5 : 
       stable.personality === "aggressive" ? 1.2 : 
       stable.personality === "conservative" ? 0.5 : 1.0);
    
    // Random check based on propensity
    if (Math.random() > claimingPropensity * 0.3) continue;
    
    for (const entry of race.entries) {
      const horse = state.horses.find((h) => h.id === entry.horseId);
      if (!horse) continue;
      if (horse.stableId === stable.id) continue; // Don't claim own horses
      
      // Check if stable has sufficient funds
      if (stable.cash < race.claimingPrice * 1.1) continue;
      
      // Check horse eligibility
      if (!isHorseEligibleForClaimingPrice(horse, race.claimingPrice, state.horses)) continue;
      
      // Strategic considerations based on personality
      if (stable.personality === "developer" && horse.age > 4) continue;
      if (stable.personality === "win-now" && horse.age < 4) continue;
      if (stable.personality === "specialist") {
        if (personality.specialistDistance && race.distance !== personality.specialistDistance) continue;
        if (personality.specialistSurface && race.surface !== personality.specialistSurface) continue;
      }
      
      intents.push({
        id: generateUUID(),
        entityId: horse.id,
        source: "npc",
        sourceId: stable.id,
        day,
        priority: 60,
        type: "claiming",
        raceId: race.id,
        horseId: horse.id,
        claimantStableId: stable.id,
        claimingPrice: race.claimingPrice,
      });
    }
  }
  
  return intents;
}
