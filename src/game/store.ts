import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GameState, Horse, Race, Pregnancy } from "./types";
import { generateHorse, generateRace, horsePrice, makeGradedRace } from "./horseGen";
import { GRADED_RACES } from "./gradedRaces";
import { beyerFigure, distanceBucket, setCalibratedPars } from "./beyer";
import { loadRaceHistoryLimit } from "@/services/storageAdapter";
import { calculateBreedingCompatibility } from "./breedingCompatibility";
import { loadGameState, saveGameState } from "@/services/storageAdapter";

const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];
const UPKEEP_PER_HORSE = 50;
export const TRAINING_COST = 75;
const TRAINING_SLOTS_PER_DAY = 2;
const STARTING_CASH = 5000;
const BREEDING_FEE = 2000;
const LIVE_FOAL_GUARANTEE_FEE = 1000; // Additional fee for live foal guarantee
const GESTATION_DAYS = 30;
const SEASON_DAYS = 30;
const MAX_SAMPLES_PER_BUCKET = 60;

// Recompute par-time per distance bucket from collected winner finish times.
// Uses a slightly-faster-than-median (40th percentile) to match the
// "above-average winner" intent of Beyer par.
function recomputePars(samples: Record<number, number[]>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [k, arr] of Object.entries(samples)) {
    if (arr.length < 3) continue;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.4);
    out[Number(k)] = sorted[idx];
  }
  return out;
}

type Actions = {
  newGame: () => void;
  trainHorse: (horseId: string, kind: "speed" | "stamina" | "acceleration" | "rest") => void;
  buyHorse: (horseId: string) => void;
  enterRace: (raceId: string, horseId: string) => void;
  withdrawRace: (raceId: string, horseId: string) => void;
  resolveRace: (raceId: string, result: { horseId: string; position: number; time: number }[]) => void;
  breed: (sireId: string, damId: string, liveFoalGuarantee?: boolean) => void;
  advanceDay: () => void;
};

function initialState(): GameState {
  const horses: Horse[] = [
    { ...generateHorse({ tier: "starter", owned: true }) },
    { ...generateHorse({ tier: "starter", owned: true }) },
  ];
  const market: Horse[] = Array.from({ length: 5 }, () => generateHorse({ tier: Math.random() < 0.6 ? "budget" : "mid" }));
  const races: Race[] = [];
  for (let d = 1; d <= 7; d++) {
    const count = Math.random() < 0.7 ? 2 : 3;
    for (let i = 0; i < count; i++) races.push(generateRace(d));
  }
  // Schedule the full first year of real graded stakes
  for (const g of GRADED_RACES) {
    races.push(makeGradedRace(g, g.dayOfYear));
  }
  return {
    day: 1,
    cash: STARTING_CASH,
    horses,
    market,
    races,
    trainingUsed: {},
    log: [{ day: 1, text: "Welcome to your stable. Train your horses and enter them in races!" }],
    pregnancies: [],
  };
}

// Custom storage adapter for Zustand persist using OPFS
const opfsStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const state = await loadGameState();
    return state ? JSON.stringify(state) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    // Zustand persist passes a JSON string (when using createJSONStorage)
    // We need to parse it to get the state object, then save it
    try {
      const state = JSON.parse(value) as GameState;
      await saveGameState(state);
    } catch (error) {
      console.error('Failed to parse state in setItem:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    // Clear game state - handled by storageAdapter
    await (await import('@/services/storageAdapter')).clearGameState();
  },
};

// Wrap with createJSONStorage for proper serialization
const jsonStorage = createJSONStorage(() => opfsStorage);

// Flag to track if hydration has completed
export let hydrationComplete = false;

export const useGame = create<GameState & Actions>()(
  persist(
    (set, get) => ({
      // Start with empty state, will be hydrated from storage
      day: 1,
      cash: STARTING_CASH,
      horses: [],
      market: [],
      races: [],
      trainingUsed: {},
      log: [],
      pregnancies: [],
      paceSamples: {},
      calibratedPars: {},
      lastCalibrationDay: 0,

      newGame: async () => {
        // Clear OPFS storage when starting a new game
        await (await import('@/services/storageAdapter')).clearGameState();
        set({ ...initialState() });
      },

      trainHorse: (horseId, kind) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return;
        if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return;
        // Check if horse has covering sickness - prevent training
        if (horse.healthStatus === "covering_sickness") {
          set({
            log: [
              { day: s.day, text: `❌ Training blocked: ${horse.name} has covering sickness (dourine). Horse cannot be trained while infected.` },
              ...s.log,
            ].slice(0, 50),
          });
          return;
        }
        const usedToday = s.trainingUsed[horseId] || 0;
        if (usedToday >= TRAINING_SLOTS_PER_DAY) return;
        if (horse.energy < 10) return;
        if (kind === "rest") {
          horse.energy = Math.min(100, horse.energy + 30);
        } else {
          const cost = 75;
          if (s.cash < cost) return;
          if (horse.energy < 15) return;
          horse.energy = Math.max(0, horse.energy - 18);
          // gain chance
          const stat = horse.stats[kind];
          const gap = horse.potential - stat;
          if (gap > 0 && Math.random() < 0.65) {
            const gain = Math.min(gap, Math.random() < 0.2 ? 2 : 1);
            horse.stats[kind] = Math.min(horse.potential, stat + gain);
          }
          s.cash -= cost;
        }
        set({
          horses: [...s.horses],
          cash: s.cash,
          trainingUsed: { ...s.trainingUsed, [horseId]: usedToday + 1 },
        });
      },

      buyHorse: (horseId) => {
        const s = get();
        const h = s.market.find((m) => m.id === horseId);
        if (!h) return;
        const price = horsePrice(h);
        if (s.cash < price) return;
        const bought: Horse = { ...h, owned: true };
        set({
          cash: s.cash - price,
          horses: [...s.horses, bought],
          market: s.market.filter((m) => m.id !== horseId),
          log: [{ day: s.day, text: `Bought ${h.name} for $${price.toLocaleString()}.` }, ...s.log].slice(0, 50),
        });
      },

      enterRace: (raceId, horseId) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        const horse = s.horses.find((h) => h.id === horseId);
        if (!race || !horse) return;
        if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return;
        if (race.resolved) return;
        if (s.cash < race.entryFee) return;
        if (race.entries.some((e) => e.horseId === horseId)) return;
        if (race.entries.length >= race.fieldSize) return;
        const r = race.restrictions;
        if (r) {
          // Check hemisphere-specific age restrictions first
          const minAgeToCheck = horse.hemisphere === "Northern" 
            ? (r.minAgeNorthern ?? r.minAge) 
            : (r.minAgeSouthern ?? r.minAge);
          if (minAgeToCheck !== undefined && horse.age < minAgeToCheck) return;
          if (r.maxAge !== undefined && horse.age > r.maxAge) return;
        }
        race.entries.push({ horseId, owned: true });
        set({
          races: [...s.races],
          cash: s.cash - race.entryFee,
          log: [{ day: s.day, text: `Entered ${horse.name} in ${race.name}.` }, ...s.log].slice(0, 50),
        });
      },

      withdrawRace: (raceId, horseId) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race || race.resolved) return;
        race.entries = race.entries.filter((e) => e.horseId !== horseId);
        set({ races: [...s.races], cash: s.cash + Math.floor(race.entryFee / 2) });
      },

      resolveRace: (raceId, result) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race || race.resolved) return;
        race.resolved = true;
        race.result = result;
        let earned = 0;
        const classBonus = race.graded?.grade === "G1" ? 8 : race.graded?.grade === "G2" ? 5 : race.graded?.grade === "G3" ? 3 : race.raceClass === "Group" ? 4 : race.raceClass === "Stakes" ? 2 : 0;
        for (const r of result) {
          const h = s.horses.find((hh) => hh.id === r.horseId);
          if (!h) continue;
          h.energy = Math.max(0, h.energy - 25); // Racing costs 25 energy
          const beyer = beyerFigure({ distance: race.distance, finishTime: r.time, classBonus });
          h.raceHistory = [{ raceId, raceName: race.name, position: r.position, day: s.day, beyer, grade: race.graded?.grade, distance: race.distance, surface: race.graded?.surface, purse: race.purse, fieldSize: result.length }, ...h.raceHistory].slice(0, loadRaceHistoryLimit());
          // form change
          if (r.position === 1) h.form = Math.min(10, h.form + 3);
          else if (r.position <= 3) h.form = Math.min(10, h.form + 1);
          else h.form = Math.max(-10, h.form - 1);
          // payout
          if (r.position <= PRIZE_SPLIT.length) {
            earned += Math.round(race.purse * PRIZE_SPLIT[r.position - 1]);
          }
          // Update dam's blue hen status if horse wins a stakes race
          if (r.position === 1 && (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")) {
            const dam = s.horses.find((hh) => hh.name === h.damName);
            if (dam && dam.blueHenStatus) {
              dam.blueHenStatus.stakesWinnersProduced += 1;
              if (race.graded?.grade === "G1") {
                dam.blueHenStatus.group1WinnersProduced += 1;
              }
              // Recalculate blue hen score
              const baseScore = Math.min(dam.blueHenStatus.stakesWinnersProduced * 15, 60);
              const g1Bonus = dam.blueHenStatus.group1WinnersProduced * 20;
              dam.blueHenStatus.blueHenScore = Math.min(baseScore + g1Bonus, 100);
              // Update blue hen status
              if (dam.blueHenStatus.stakesWinnersProduced >= 2 || dam.blueHenStatus.group1WinnersProduced >= 1) {
                dam.blueHenStatus.isBlueHen = true;
              }
            }
          }
        }
        const ownerResults = result.filter((r) => s.horses.some((h) => h.id === r.horseId));
        const summary = ownerResults
          .map((r) => {
            const h = s.horses.find((hh) => hh.id === r.horseId)!;
            return `${h.name}: ${r.position}${ord(r.position)}`;
          })
          .join(", ");
        // Record winner finish time into pace samples for this distance bucket.
        const samples: Record<number, number[]> = { ...(s.paceSamples ?? {}) };
        const winner = result.find((r) => r.position === 1);
        if (winner && isFinite(winner.time) && winner.time > 0) {
          const b = distanceBucket(race.distance);
          const arr = [...(samples[b] ?? []), winner.time];
          if (arr.length > MAX_SAMPLES_PER_BUCKET) arr.splice(0, arr.length - MAX_SAMPLES_PER_BUCKET);
          samples[b] = arr;
        }
        set({
          races: [...s.races],
          horses: [...s.horses],
          cash: s.cash + earned,
          paceSamples: samples,
          log: [
            { day: s.day, text: `${race.name} — ${summary}${earned ? ` (won $${earned.toLocaleString()})` : ""}` },
            ...s.log,
          ].slice(0, 50),
        });
      },

      breed: (sireId, damId, liveFoalGuarantee = false) => {
        const s = get();
        if (sireId === damId) return;
        const sire = s.horses.find((h) => h.id === sireId);
        const dam = s.horses.find((h) => h.id === damId);
        if (!sire || !dam) return;
        
        // Check for covering sickness - prevent breeding if either parent has it
        if (sire.healthStatus === "covering_sickness" || dam.healthStatus === "covering_sickness") {
          set({
            log: [
              { day: s.day, text: `❌ Breeding blocked: Covering sickness (dourine) detected. This sexually transmitted disease cannot be bred.` },
              ...s.log,
            ].slice(0, 50),
          });
          return;
        }
        
        const totalFee = BREEDING_FEE + (liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0);
        if (s.cash < totalFee) return;
        const dueDay = s.day + GESTATION_DAYS;
        const preg: Pregnancy = {
          id: Math.random().toString(36).slice(2, 10),
          sireId, damId,
          sireName: sire.name, damName: dam.name,
          conceivedDay: s.day,
          dueDay,
          resolved: false,
          liveFoalGuarantee,
          reBreedingAttempts: 0,
        };
        set({
          cash: s.cash - totalFee,
          pregnancies: [preg, ...s.pregnancies],
          log: [
            { day: s.day, text: `🐴 Mated ${sire.name} × ${dam.name} (foal due day ${dueDay}). Fee $${totalFee.toLocaleString()}${liveFoalGuarantee ? " (Live Foal Guarantee)" : ""}.` },
            ...s.log,
          ].slice(0, 50),
        });
      },

      advanceDay: () => {
        const s = get();
        // auto-resolve any unresolved races scheduled for current day with no owned entries
        for (const race of s.races) {
          if (race.resolved) continue;
          if (race.day > s.day) continue;
          // skip if owned horse entered (player must run them via UI; but if missed, auto-resolve as DNS)
          race.resolved = true;
          race.result = [];
        }
        // upkeep
        const upkeep = s.horses.length * UPKEEP_PER_HORSE;
        // restore energy
        const horses = s.horses.map((h) => ({ ...h, energy: Math.min(100, h.energy + 35) }));
        // refresh market: remove 1-2 oldest, add new
        let market = [...s.market];
        if (market.length > 3) market = market.slice(2);
        while (market.length < 5) {
          const r = Math.random();
          const tier = r < 0.5 ? "budget" : r < 0.85 ? "mid" : "elite";
          market.push(generateHorse({ tier: tier as never }));
        }
        // add new races 7 days out
        const races = [...s.races];
        const newDay = s.day + 1;
        const futureDay = newDay + 6;
        const count = Math.random() < 0.7 ? 2 : 3;
        for (let i = 0; i < count; i++) races.push(generateRace(futureDay));
        // Top up real graded stakes whose dayOfYear falls in the upcoming 7-day window
        for (let offset = 1; offset <= 7; offset++) {
          const fday = newDay + offset;
          const dY = ((fday - 1) % 365) + 1;
          for (const g of GRADED_RACES) {
            if (g.dayOfYear !== dY) continue;
            if (races.some((r) => r.graded?.key === g.key && r.day === fday)) continue;
            races.push(makeGradedRace(g, fday));
          }
        }
        // prune ancient resolved races
        const pruned = races.filter((r) => r.day >= newDay - 3);

        // resolve births
        const newLogs: { day: number; text: string }[] = [];
        const pregnancies = s.pregnancies.map((p) => ({ ...p }));
        let foals: Horse[] = [];
        let cashAdjustment = 0;
        for (const p of pregnancies) {
          if (p.resolved) continue;
          if (newDay < p.dueDay) continue;
          const sire = s.horses.find((h) => h.id === p.sireId);
          const dam = s.horses.find((h) => h.id === p.damId);
          
          // Check for foal complications (based on live foal guarantee concept)
          const complicationRoll = Math.random();
          const hasComplication = complicationRoll < 0.05; // 5% chance of complications
          const complicationType = hasComplication ? (Math.random() < 0.5 ? "stillborn" : "unable to stand") : null;
          
          // Check for covering sickness transmission (if parents were infected during pregnancy)
          // This is a simplified model - in reality, covering sickness is transmitted during breeding
          const transmissionRoll = Math.random();
          const hasTransmission = transmissionRoll < 0.01; // 1% chance if parents were healthy
          
          const isLiveFoal = !hasComplication;
          
          if (isLiveFoal) {
            const foal = generateHorse({ tier: "starter", owned: true });
            foal.age = 0;
            foal.sireName = p.sireName;
            foal.damName = p.damName;
            if (sire && dam) {
              // Calculate breeding compatibility
              const compatibility = calculateBreedingCompatibility(sire, dam);
              
              // Base stats from parents with random variation
              const baseVariance = 8;
              const compatibilityBonus = compatibility.overallScore * 5; // Up to +5 from good compatibility
              
              foal.stats = {
                speed: Math.round((sire.stats.speed + dam.stats.speed) / 2 + (Math.random() * baseVariance - baseVariance/2) + compatibilityBonus),
                stamina: Math.round((sire.stats.stamina + dam.stats.stamina) / 2 + (Math.random() * baseVariance - baseVariance/2) + compatibilityBonus),
                acceleration: Math.round((sire.stats.acceleration + dam.stats.acceleration) / 2 + (Math.random() * baseVariance - baseVariance/2) + compatibilityBonus),
                consistency: Math.round((sire.stats.consistency + dam.stats.consistency) / 2 + (Math.random() * baseVariance - baseVariance/2) + compatibilityBonus),
              };
              
              // Potential influenced by compatibility and parent potential
              foal.potential = Math.min(100, Math.round((sire.potential + dam.potential) / 2 + (Math.random() * 8 - 2) + compatibilityBonus));
              
              // Conformation and temperament influenced by parents
              const confValues: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
              const tempValues: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
              
              const sireConf = sire.conformation || "fair";
              const damConf = dam.conformation || "fair";
              const sireTemp = sire.temperament || "fair";
              const damTemp = dam.temperament || "fair";
              
              const avgConf = (confValues[sireConf] + confValues[damConf]) / 2;
              const avgTemp = (tempValues[sireTemp] + tempValues[damTemp]) / 2;
              
              // Inherit conformation with some randomness
              const confRoll = avgConf + (Math.random() * 2 - 1);
              if (confRoll >= 3.5) foal.conformation = "excellent";
              else if (confRoll >= 2.5) foal.conformation = "good";
              else if (confRoll >= 1.5) foal.conformation = "fair";
              else foal.conformation = "poor";
              
              // Inherit temperament with some randomness
              const tempRoll = avgTemp + (Math.random() * 2 - 1);
              if (tempRoll >= 3.5) foal.temperament = "excellent";
              else if (tempRoll >= 2.5) foal.temperament = "good";
              else if (tempRoll >= 1.5) foal.temperament = "fair";
              else foal.temperament = "poor";
              
              // Inherit genetic markers from parents
              const sireGenetics = sire.geneticMarkers;
              const damGenetics = dam.geneticMarkers;
              if (sireGenetics && damGenetics) {
                foal.geneticMarkers = {
                  sensoryPerception: inheritGeneticTrait(sireGenetics.sensoryPerception, damGenetics.sensoryPerception),
                  signalTransduction: inheritGeneticTrait(sireGenetics.signalTransduction, damGenetics.signalTransduction),
                  immunity: inheritGeneticTrait(sireGenetics.immunity, damGenetics.immunity),
                  geneticDiversity: ((sireGenetics.geneticDiversity || 0.5) + (damGenetics.geneticDiversity || 0.5)) / 2 + (Math.random() * 0.2 - 0.1),
                };
              }
              
              // Update dam's blue hen status
              if (dam.blueHenStatus) {
                dam.blueHenStatus.foalsProduced = (dam.blueHenStatus.foalsProduced || 0) + 1;
                
                // Calculate blue hen score based on production
                const baseScore = Math.min(dam.blueHenStatus.stakesWinnersProduced * 15, 60);
                const g1Bonus = dam.blueHenStatus.group1WinnersProduced * 20;
                dam.blueHenStatus.blueHenScore = Math.min(baseScore + g1Bonus, 100);
                
                // Blue hen status threshold: 2+ stakes winners or 1+ G1 winner
                if (dam.blueHenStatus.stakesWinnersProduced >= 2 || dam.blueHenStatus.group1WinnersProduced >= 1) {
                  dam.blueHenStatus.isBlueHen = true;
                }
                
                // Track foal ID
                if (!dam.foalsProduced) dam.foalsProduced = [];
                dam.foalsProduced.push(foal.id);
              } else {
                // Initialize blue hen status for first foal
                dam.blueHenStatus = {
                  isBlueHen: false,
                  stakesWinnersProduced: 1,
                  group1WinnersProduced: 0,
                  blueHenScore: 15,
                  foalsProduced: 1,
                };
                dam.foalsProduced = [foal.id];
              }
            }
            p.resolved = true;
            p.foalId = foal.id;
            foals.push(foal);
            
            // Set health status if transmission occurred
            if (hasTransmission) {
              foal.healthStatus = "covering_sickness";
              foal.healthStatusDay = newDay;
              newLogs.push({ day: newDay, text: `🍼 Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}). ⚠️ Covering sickness detected.` });
            } else {
              newLogs.push({ day: newDay, text: `🍼 Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}).` });
            }
          } else {
            // Foal had complications - check for live foal guarantee
            if (p.liveFoalGuarantee && (p.reBreedingAttempts || 0) < 3) {
              // Trigger re-breeding (same breeding season) - refund breeding fee
              const refundAmount = BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE;
              cashAdjustment += refundAmount;
              p.resolved = false;
              p.dueDay = newDay + GESTATION_DAYS;
              p.reBreedingAttempts = (p.reBreedingAttempts || 0) + 1;
              newLogs.push({ 
                day: newDay, 
                text: `💔 Foal ${complicationType} - Live Foal Guarantee triggered. Refunded $${refundAmount.toLocaleString()}. Re-breeding ${p.damName} to ${p.sireName}. Attempt ${p.reBreedingAttempts}/3. New due day ${p.dueDay}.` 
              });
            } else {
              // No guarantee or attempts exhausted
              p.resolved = true;
              newLogs.push({ 
                day: newDay, 
                text: `💔 Foal ${complicationType}${p.liveFoalGuarantee ? ". Live Foal Guarantee attempts exhausted." : "."}` 
              });
            }
          }
        }

        // Seasonal Beyer par recalibration from collected pace samples.
        let calibratedPars = s.calibratedPars;
        let lastCalibrationDay = s.lastCalibrationDay ?? 0;
        const seasonLog: { day: number; text: string }[] = [];
        if (newDay - lastCalibrationDay >= SEASON_DAYS) {
          const recomputed = recomputePars(s.paceSamples ?? {});
          if (Object.keys(recomputed).length > 0) {
            calibratedPars = recomputed;
            setCalibratedPars(recomputed);
            lastCalibrationDay = newDay;
            const buckets = Object.keys(recomputed).length;
            seasonLog.push({ day: newDay, text: `📊 Beyer par recalibrated from ${buckets} distance bucket${buckets === 1 ? "" : "s"}.` });
          }
        }

        set({
          day: newDay,
          cash: s.cash - upkeep + cashAdjustment,
          horses: [...horses, ...foals],
          market,
          races: pruned,
          trainingUsed: {},
          pregnancies,
          calibratedPars,
          lastCalibrationDay,
          log: [...seasonLog, ...newLogs, { day: newDay, text: `Day ${newDay} begins. Upkeep: $${upkeep}.` }, ...s.log].slice(0, 50),
        });
      },
    }),
    {
      name: "horse-racing-game-v1",
      storage: jsonStorage,
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        hydrationComplete = true;
        if (state?.calibratedPars) setCalibratedPars(state.calibratedPars);
      },
    }
  )
);

// Function to manually rehydrate the store (call on client mount)
export async function rehydrateStore() {
  const state = await loadGameState();
  if (state) {
    // Use the persist middleware's built-in rehydrate
    // This will call getItem from our custom storage
    await useGame.persist.rehydrate();
    hydrationComplete = true;
    if (state.calibratedPars) setCalibratedPars(state.calibratedPars);
  } else {
    // No saved state, initialize with default
    useGame.setState(initialState());
    hydrationComplete = true;
  }
}

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function inheritGeneticTrait(sireTrait: string | undefined, damTrait: string | undefined): "excellent" | "good" | "fair" | "poor" {
  const traitValues: Record<string, number> = { excellent: 4, good: 3, fair: 2, poor: 1 };
  const sireValue = traitValues[sireTrait || "fair"] || 2;
  const damValue = traitValues[damTrait || "fair"] || 2;
  const avgValue = (sireValue + damValue) / 2;
  const roll = avgValue + (Math.random() * 2 - 1);
  
  if (roll >= 3.5) return "excellent";
  else if (roll >= 2.5) return "good";
  else if (roll >= 1.5) return "fair";
  else return "poor";
}
