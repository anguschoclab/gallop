import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Horse, Race, Pregnancy, ScoutReport, AuctionSale, GameState } from "./types";
import { GRADED_RACES } from "./gradedRaces";
import { generateHorse, horsePrice, generateRace, makeGradedRace, horsePriceWithPedigree } from "./horseGen";
import { generateInitialJockeys } from "./jockeyGen";
import { generateAllStables } from "./npcStables";
import { generateAllNpcHorses } from "./npcHorseGen";
import { runNpcRaceEntry, runNpcTraining, updateHorseFame } from "./npcRaceEntry";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { calculateOverallRating } from "@/core/horse/stats";
import { createRng, hashStr, type Rng } from "./rng";
import { generateUpcomingRaces as generateScheduledRaces } from "./raceSchedule";
import { TRACKS, TRACK_SCHEDULES, type Track } from "./tracks";
import { scoutHorse as performScout } from "./scouting";
import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { loadRaceHistoryLimit } from "@/services/storageAdapter";
import { loadGameState, saveGameState } from "@/services/storageAdapter";
import { canBreed, type BreedResult } from "@/core/breeding/eligibility";
import { getStakesFoalsBy, getG1FoalsBy, getFoalsBy } from "@/core/breeding/lineage";
import { generateUUID } from "./uuid";
import { resolveFoaling } from "./foalGen";
import { beyerFigure, distanceBucket, setCalibratedPars, expectedBeyer } from "./beyer";
import { runRaceToCompletion, type Runner } from "./raceSim";
import { generateAuctionLots, resolveAuctionSale } from "./auction";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { isUniversalBirthday, isBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import { detectInbreedingPattern, inbreedingPerformanceDampener } from "@/core/breeding/populationGenetics";
import { recalcStandingFee } from "@/core/breeding/stallions";
import { awardsPhase } from "@/core/time/phases/awards";
import { executePipeline, createPhase, type PipelineContext } from "@/core/time/pipeline";
import { upkeepPhase } from "@/core/time/phases/upkeep";
import { agingPhase } from "@/core/time/phases/aging";
import { breedingSeasonPhase } from "@/core/time/phases/breedingSeason";
import { npcBreedingPhase } from "@/core/time/phases/npcBreedingPhase";
import { energyPhase } from "@/core/time/phases/energy";
import { marketPhase } from "@/core/time/phases/market";
import { racesPhase } from "@/core/time/phases/races";
import { beyerRecalibrationPhase } from "@/core/time/phases/beyerRecalibration";
import { pregnancyPhase } from "@/core/time/phases/pregnancy";
import { npcCyclePhase } from "@/core/time/phases/npcCycle";
import { auctionsPhase } from "@/core/time/phases/auctions";
import { jockeyPhase } from "@/core/time/phases/jockeyPhase";
import { stateUpdatePhase } from "@/core/time/phases/stateUpdate";
import { computePlayerRaceDays, advanceMultipleDaysWithRaceDetection } from "@/core/time/advance";

export type ActionResult = { ok: true } | { ok: false, reason: string };

const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];
const UPKEEP_PER_HORSE = 50;
export const TRAINING_COST = 75;
const TRAINING_SLOTS_PER_DAY = 2;
const STARTING_CASH = 5000;
const BREEDING_FEE = 2000;

// =============================================================================
// Race Resolution Helpers
// =============================================================================

function computePayoutSplits(purse: number, finisherCount: number): number[] {
  const splits: number[] = [];
  let runningPaid = 0;
  for (let i = 0; i < Math.min(PRIZE_SPLIT.length, finisherCount); i++) {
    const pay = Math.round(purse * PRIZE_SPLIT[i]);
    splits.push(pay);
    runningPaid += pay;
  }
  // Route any unpaid remainder to the last paid finisher
  if (splits.length > 0 && runningPaid < purse && finisherCount >= PRIZE_SPLIT.length) {
    splits[splits.length - 1] += purse - runningPaid;
  }
  return splits;
}

function getClassBonus(grade: "G1" | "G2" | "G3" | undefined, raceClass: Race["raceClass"]): number {
  if (grade === "G1") return 8;
  if (grade === "G2") return 5;
  if (grade === "G3") return 3;
  if (raceClass === "Group") return 4;
  if (raceClass === "Stakes") return 2;
  return 0;
}

function updateBlueHenStatus(dam: Horse, raceGrade: "G1" | "G2" | "G3" | undefined): void {
  if (!dam.blueHenStatus) {
    dam.blueHenStatus = {
      isBlueHen: false,
      stakesWinnersProduced: 0,
      group1WinnersProduced: 0,
      blueHenScore: 0,
      foalsProduced: dam.foalsProduced?.length ?? 0,
    };
  }
  dam.blueHenStatus.stakesWinnersProduced += 1;
  if (raceGrade === "G1") {
    dam.blueHenStatus.group1WinnersProduced += 1;
  }
  const baseScore = Math.min(dam.blueHenStatus.stakesWinnersProduced * 15, 60);
  const g1Bonus = dam.blueHenStatus.group1WinnersProduced * 20;
  dam.blueHenStatus.blueHenScore = Math.min(baseScore + g1Bonus, 100);
  if (dam.blueHenStatus.stakesWinnersProduced >= 2 || dam.blueHenStatus.group1WinnersProduced >= 1) {
    dam.blueHenStatus.isBlueHen = true;
  }
  // Sync the count with the array length
  dam.blueHenStatus.foalsProduced = dam.foalsProduced?.length ?? 0;
}

// =============================================================================
// Day Advancement Helpers
// =============================================================================

function ageHorses(horses: Horse[], newDay: number): Horse[] {
  // Per-hemisphere "universal birthday": Northern horses age up on Jan 1 (day-
  // of-year 1), Southern on Aug 1 (DoY 213). Replaces the prior global tick.
  const northernTick = isUniversalBirthday(newDay, "Northern");
  const southernTick = isUniversalBirthday(newDay, "Southern");
  if (!northernTick && !southernTick) return horses;
  return horses.map((h) => {
    const ticks = (h.hemisphere === "Northern" && northernTick) || (h.hemisphere === "Southern" && southernTick);
    if (!ticks) return h;
    const newAge = h.age + 1;
    const newGender =
      newAge >= 3
        ? h.gender === "colt" ? "horse" : h.gender === "filly" ? "mare" : h.gender
        : h.gender;
    return { ...h, age: newAge, gender: newGender };
  });
}

export function refreshMarket(currentMarket: Horse[], rng: Rng): Horse[] {
  let market = [...currentMarket];
  if (market.length > 3) market = market.slice(2);
  while (market.length < 5) {
    const r = rng.next();
    const tier = r < 0.5 ? "budget" : r < 0.85 ? "mid" : "elite";
    market.push(generateHorse({ tier: tier as never }, rng));
  }
  return market;
}

export function generateUpcomingRaces(currentRaces: Race[], newDay: number, rng: Rng): Race[] {
  // Use the new track-based schedule system
  return generateScheduledRaces(currentRaces, newDay, TRACK_SCHEDULES, rng);
}

export function pruneOldRaces(races: Race[], newDay: number): Race[] {
  return races.filter((r) => r.graded || r.day >= newDay - 3);
}

type PregnancyResult = {
  pregnancies: Pregnancy[];
  foals: Horse[];
  cashAdjustment: number;
  logs: { day: number; text: string }[];
};

export function resolvePregnancies(
  currentPregnancies: Pregnancy[],
  horses: Horse[],
  newDay: number
): PregnancyResult {
  const newLogs: { day: number; text: string }[] = [];
  const pregnancies = currentPregnancies.map((p) => ({ ...p }));
  const damsById = new Map(horses.map((h) => [h.id, h]));
  const foals: Horse[] = [];
  let cashAdjustment = 0;

  for (const p of pregnancies) {
    if (p.resolved) continue;
    if (newDay < p.dueDay) continue;
    const sire = damsById.get(p.sireId);
    const dam = damsById.get(p.damId);
    const outcome = resolveFoaling(p, sire, dam);

    if (outcome.kind === "live") {
      const foal = outcome.foal;
      if (dam) {
        if (!dam.blueHenStatus) {
          dam.blueHenStatus = {
            isBlueHen: false,
            stakesWinnersProduced: 0,
            group1WinnersProduced: 0,
            blueHenScore: 0,
            foalsProduced: dam.foalsProduced?.length ?? 0,
          };
        }
        dam.blueHenStatus.foalsProduced = (dam.foalsProduced?.length ?? 0) + 1;
        const baseScore = Math.min(dam.blueHenStatus.stakesWinnersProduced * 15, 60);
        const g1Bonus = dam.blueHenStatus.group1WinnersProduced * 20;
        dam.blueHenStatus.blueHenScore = Math.min(baseScore + g1Bonus, 100);
        if (dam.blueHenStatus.stakesWinnersProduced >= 2 || dam.blueHenStatus.group1WinnersProduced >= 1) {
          dam.blueHenStatus.isBlueHen = true;
        }
        if (!dam.foalsProduced) dam.foalsProduced = [];
        dam.foalsProduced.push(foal.id);
        dam.lastFoaledDay = newDay;
      }
      
      // Update sire's lifetime foals count using lineage helper
      if (sire && sire.stud) {
        sire.stud.lifetimeFoals = getFoalsBy({ horses: [...horses, foal] }, sire.id).length;
      }
      
      p.resolved = true;
      p.foalId = foal.id;
      foals.push(foal);

      if (outcome.transmission) {
        foal.healthStatus = "covering_sickness";
        foal.healthStatusDay = newDay;
        newLogs.push({ day: newDay, text: `Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}). Covering sickness detected.` });
      } else {
        newLogs.push({ day: newDay, text: `Foal born: ${foal.name} (by ${p.sireName} out of ${p.damName}).` });
      }
    } else {
      // Live Foal Guarantee handling
      const canRefund = p.liveFoalGuarantee && !p.refunded;
      const canRetry = p.liveFoalGuarantee && (p.reBreedingAttempts || 0) < 3;
      if (canRetry) {
        if (canRefund) {
          cashAdjustment += BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE;
          p.refunded = true;
        }
        p.resolved = false;
        p.dueDay = newDay + GESTATION_DAYS;
        p.reBreedingAttempts = (p.reBreedingAttempts || 0) + 1;
        newLogs.push({
          day: newDay,
          text: `Foal ${outcome.type}${canRefund ? ` — Live Foal Guarantee refunded $${(BREEDING_FEE + LIVE_FOAL_GUARANTEE_FEE).toLocaleString()}.` : "."} Re-breeding ${p.damName} to ${p.sireName}. Attempt ${p.reBreedingAttempts}/3. New due day ${p.dueDay}.`,
        });
      } else {
        p.resolved = true;
        newLogs.push({
          day: newDay,
          text: `Foal ${outcome.type}${p.liveFoalGuarantee ? ". Live Foal Guarantee attempts exhausted." : "."}`,
        });
      }
    }
  }

  return { pregnancies, foals, cashAdjustment, logs: newLogs };
}

type RecalibrationResult = {
  calibratedPars: Record<number, number> | undefined;
  lastCalibrationDay: number;
  log: { day: number; text: string } | null;
};

export function maybeRecalibratePars(
  currentPars: Record<number, number> | undefined,
  lastCalibrationDay: number,
  paceSamples: Record<number, number[]> | undefined,
  newDay: number
): RecalibrationResult {
  if (newDay - lastCalibrationDay < SEASON_DAYS) {
    return { calibratedPars: currentPars, lastCalibrationDay, log: null };
  }
  const recomputed = recomputePars(paceSamples ?? {});
  if (Object.keys(recomputed).length === 0) {
    return { calibratedPars: currentPars, lastCalibrationDay, log: null };
  }
  setCalibratedPars(recomputed);
  const buckets = Object.keys(recomputed).length;
  return {
    calibratedPars: recomputed,
    lastCalibrationDay: newDay,
    log: { day: newDay, text: `Beyer par recalibrated from ${buckets} distance bucket${buckets === 1 ? "" : "s"}.` },
  };
}

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
  enterRace: (raceId: string, horseId: string) => ActionResult;
  withdrawRace: (raceId: string, horseId: string) => void;
  resolveRace: (raceId: string, result: { horseId: string; position: number; time: number }[], runners?: import("./raceSim").Runner[]) => void;
  breed: (sireId: string, damId: string, liveFoalGuarantee?: boolean) => ActionResult;
  retireToStud: (horseId: string, fee: number, bookSize: number) => ActionResult;
  hireJockey: (jockeyId: string) => ActionResult;
  assignJockey: (raceId: string, horseId: string, jockeyId: string) => ActionResult;
  advanceDay: () => void;
  advanceMultipleDays: (n: number, headless?: boolean) => void;
  advanceWeek: (headless?: boolean) => void;
  advanceMonth: (headless?: boolean) => void;
  advanceYear: (headless?: boolean) => void;
  scoutHorse: (horseId: string) => { success: boolean; report?: ScoutReport; cost: number; message: string };
  consignHorse: (horseId: string, saleId: string) => ActionResult;
  withdrawConsignment: (horseId: string) => ActionResult;
  bidInAuction: (saleId: string, lotId: string, amount: number) => ActionResult;
  clearPendingCeremonies: () => void;
  geldingHorse: (horseId: string) => ActionResult;
  renameHorse: (horseId: string, newName: string) => ActionResult;
};

function initialState(): GameState {
  const setupRng = createRng(hashStr("initial_setup"));
  
  // Generate player horses
  const horses: Horse[] = [
    { ...generateHorse({ tier: "starter", owned: true }, setupRng) },
    { ...generateHorse({ tier: "starter", owned: true }, setupRng) },
  ];
  
  const market: Horse[] = Array.from({ length: 5 }, () => {
    const r = setupRng.next();
    const tier = r < 0.6 ? "budget" : "mid";
    return generateHorse({ tier: tier as any }, setupRng);
  });
  
  const races: Race[] = [];
  for (let d = 1; d <= 7; d++) {
    const dayRng = createRng(hashStr(`raceGen_${d}`));
    const count = dayRng.next() < 0.7 ? 2 : 3;
    for (let i = 0; i < count; i++) races.push(generateRace(d, dayRng));
  }
  // Schedule the full first year of real graded stakes
  for (const g of GRADED_RACES) {
    const gradedRng = createRng(hashStr(`graded_${g.key}`));
    races.push(makeGradedRace(g, g.dayOfYear, gradedRng));
  }
  
  // Generate NPC stables and horses
  const stableRng = createRng(hashStr("initial_stables"));
  const npcStables = generateAllStables(1, stableRng);
  const npcHorseRng = createRng(hashStr("initial_npc_horses"));
  const { stables: updatedStables, horses: npcHorses } = generateAllNpcHorses(npcStables, npcHorseRng);
  
  // Generate initial jockeys
  const jockeyRng = createRng(hashStr("initial_jockeys"));
  const jockeys = generateInitialJockeys(jockeyRng);
  
  // Run initial NPC race entry to populate races
  const pregnantIds = new Set<string>();
  const entryRng = createRng(hashStr("initial_entry"));
  const racesWithEntries = runNpcRaceEntry(updatedStables, npcHorses, jockeys, races, 1, entryRng, 7, pregnantIds);
  
  return {
    day: 1,
    cash: STARTING_CASH,
    horses: [...horses, ...npcHorses],
    market,
    races: racesWithEntries,
    trainingUsed: {},
    log: [{ day: 1, text: "Welcome to your stable. Train your horses and enter them in races." }],
    pregnancies: [],
    npcStables: updatedStables,
    scoutReports: [],
    auctions: [],
    jockeys: generateInitialJockeys(createRng(hashStr("initial_jockeys")), 25),
  };
}

// Custom storage adapter for Zustand persist using OPFS
const opfsStorage = {
  getItem: async (_name: string) => {
    const state = await loadGameState();
    if (!state) return null;
    return { state, version: 0 };
  },
  setItem: async (_name: string, value: { state: GameState }) => {
    try {
      await saveGameState(value.state);
    } catch (error) {
      console.error('Failed to save game state to OPFS:', error);
    }
  },
  removeItem: async (_name: string): Promise<void> => {
    await (await import('@/services/storageAdapter')).clearGameState();
  },
};


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
      npcStables: [],
      scoutReports: [],
      auctions: [],
      jockeys: [],

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
        // Check if horse has covering sickness or is recovering - prevent training
        if (horse.healthStatus === "covering_sickness" || horse.healthStatus === "recovering") {
          set({
            log: [
              { day: s.day, text: `Training blocked: ${horse.name} is ${horse.healthStatus === "covering_sickness" ? "sick with covering sickness (dourine)" : "recovering from illness"}. Horse cannot be trained while recovering.` },
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
          // deterministic gain chance for training (modified by trainability locus)
          const trainingRng = createRng(hashStr(`training_${horseId}_${s.day}_${usedToday}`));
          const stat = horse.stats[kind];
          // peakAge cap: effective potential is reduced before peak, capped at peak
          const ageRatio = Math.min(1, horse.age / horse.peakAge);
          const effectivePotential = horse.potential * ageRatio;
          const gap = effectivePotential - stat;
          // trainability multiplier: 0.5-1.4, applied to base 0.65 chance
          const trainingChance = 0.65 * horse.trainability;
          if (gap > 0 && trainingRng.next() < trainingChance) {
            const gain = Math.min(gap, trainingRng.next() < 0.2 ? 2 : 1);
            horse.stats[kind] = Math.min(effectivePotential, stat + gain);
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
        const fail = (reason: string): ActionResult => {
          set({ log: [{ day: s.day, text: `Race entry: ${reason}` }, ...s.log].slice(0, 50) });
          return { ok: false, reason };
        };
        if (!race) return fail("Race not found.");
        if (!horse) return fail("Horse not found.");
        if (race.resolved) return fail("Race already resolved.");
        if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId)) return fail(`${horse.name} is pregnant.`);
        if (race.entries.some((e) => e.horseId === horseId)) return fail(`${horse.name} is already entered.`);
        if (race.entries.length >= race.fieldSize) return fail("Race field is full.");
        if (!horse.racingViable) return fail(`${horse.name} is not racing viable due to genetic condition.`);
        // Economic guard: refuse races whose entry fee exceeds 50% of purse —
        // this catches misconfigured races and protects the player's bankroll.
        if (race.entryFee > race.purse * 0.5) return fail("Entry fee exceeds 50% of purse.");
        if (s.cash < race.entryFee) return fail("Insufficient cash for entry fee.");
        const r = race.restrictions;
        if (r) {
          const minAgeToCheck = horse.hemisphere === "Northern"
            ? (r.minAgeNorthern ?? r.minAge)
            : (r.minAgeSouthern ?? r.minAge);
          if (minAgeToCheck !== undefined && horse.age < minAgeToCheck) {
            return fail(`${horse.name} is below minimum age (${minAgeToCheck}).`);
          }
          if (r.maxAge !== undefined && horse.age > r.maxAge) {
            return fail(`${horse.name} is above maximum age (${r.maxAge}).`);
          }
        }
        race.entries.push({ horseId, owned: true });
        set({
          races: [...s.races],
          cash: s.cash - race.entryFee,
          log: [{ day: s.day, text: `Entered ${horse.name} in ${race.name}.` }, ...s.log].slice(0, 50),
        });
        return { ok: true };
      },

      withdrawRace: (raceId, horseId) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race || race.resolved) return;
        race.entries = race.entries.filter((e) => e.horseId !== horseId);
        set({ races: [...s.races], cash: s.cash + Math.floor(race.entryFee / 2) });
      },

      resolveRace: (raceId, result, runners: Runner[] = []) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race || race.resolved) return;
        // Sanitize results: split into finishers vs DNFs
        const tieRng = createRng(hashStr(race.id) ^ 0x7e57);
        const enriched = result.map((r) => ({ ...r, dnf: !Number.isFinite(r.time) || r.time <= 0 }));
        const finishers = enriched.filter((r) => !r.dnf).sort((a, b) => {
          if (a.time === b.time) return tieRng.next() - 0.5;
          return a.time - b.time;
        });
        const dnfs = enriched.filter((r) => r.dnf);
        const ranked = [
          ...finishers.map((r, idx) => ({ ...r, position: idx + 1 })),
          ...dnfs.map((r, idx) => ({ ...r, position: finishers.length + idx + 1 })),
        ];
        race.resolved = true;
        race.result = ranked.map(({ horseId, position, time }) => ({ horseId, position, time }));

        // Detect photo finish
        let photoFinish = false;
        for (let i = 1; i < finishers.length; i++) {
          if (Math.abs(finishers[i].time - finishers[i - 1].time) < 0.05) {
            photoFinish = true;
            break;
          }
        }

        let earned = 0;
        const classBonus = getClassBonus(race.graded?.grade, race.raceClass);
        const splits = computePayoutSplits(race.purse, finishers.length);
        const stableCredits: Record<string, number> = {};

        for (const r of ranked) {
          const h = s.horses.find((hh) => hh.id === r.horseId);
          if (!h) continue;
          h.energy = Math.max(0, h.energy - 25);
          const beyer = r.dnf ? 0 : beyerFigure({ distance: race.distance, finishTime: r.time, classBonus });
          
          // Apply inbreeding performance dampener (Beyer penalty for close inbreeding)
          const inbreedingPattern = detectInbreedingPattern(h.pedigree);
          const dampener = inbreedingPerformanceDampener(inbreedingPattern);
          const adjustedBeyer = Math.max(0, beyer - dampener);
          
          const runner = runners.find(rr => rr.horseId === r.horseId);
          const barrier = runner?.barrier;
          const lane = runner?.lane;

          h.raceHistory = [{ 
            raceId, 
            raceName: race.name, 
            position: r.position, 
            day: s.day, 
            beyer: adjustedBeyer, 
            grade: race.graded?.grade, 
            distance: race.distance, 
            surface: race.graded?.surface, 
            purse: race.purse, 
            fieldSize: ranked.length, 
            raceClass: race.raceClass,
            barrier,
            lane
          }, ...h.raceHistory].slice(0, loadRaceHistoryLimit());
          
          h.careerStarts += 1;
          if (r.position === 1) h.careerWins += 1;

          if (!r.dnf && r.position - 1 < splits.length) {
            const pay = splits[r.position - 1];
            h.lifetimeEarnings += pay;
            if (h.stableId) {
              stableCredits[h.stableId] = (stableCredits[h.stableId] ?? 0) + pay;
            } else {
              earned += pay;
            }
          }
          // Update dam/sire...
          if (!r.dnf && r.position === 1 && (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")) {
            const damId = h.pedigree?.damId;
            const dam = damId
              ? s.horses.find((hh) => hh.id === damId)
              : s.horses.find((hh) => hh.name === h.damName);
            if (dam) updateBlueHenStatus(dam, race.graded?.grade);
            const sireId = h.pedigree?.sireId;
            if (sireId) {
              const sire = s.horses.find((hh) => hh.id === sireId);
              if (sire?.stud) {
                // Use lineage helpers to calculate actual progeny stats
                sire.stud.lifetimeStakesFoals = getStakesFoalsBy({ horses: s.horses }, sireId);
                sire.stud.lifetimeG1Foals = getG1FoalsBy({ horses: s.horses }, sireId);
                sire.stud.standingFee = recalcStandingFee(
                  sire.stud.standingFee,
                  sire.stud.lifetimeStakesFoals,
                  sire.stud.lifetimeG1Foals
                );
              }
            }
          }
        }
        const ownerResults = ranked.filter((r) => s.horses.some((h) => h.id === r.horseId));
        const summary = ownerResults
          .map((r) => {
            const h = s.horses.find((hh) => hh.id === r.horseId)!;
            return `${h.name}: ${r.dnf ? "DNF" : `${r.position}${getOrdinalSuffix(r.position)}`}`;
          })
          .join(", ");
        // Record winner finish time into pace samples for this distance bucket.
        const samples: Record<number, number[]> = { ...(s.paceSamples ?? {}) };
        const winner = finishers[0];
        if (winner && isFinite(winner.time) && winner.time > 0) {
          const b = distanceBucket(race.distance);
          const arr = [...(samples[b] ?? []), winner.time];
          if (arr.length > MAX_SAMPLES_PER_BUCKET) arr.splice(0, arr.length - MAX_SAMPLES_PER_BUCKET);
          samples[b] = arr;
        }

        // Process claims (currently empty array until UI/AI claim generation is added)
        // Dynamically imported to avoid circular dependency issues if any
        import("@/game/claiming").then(({ processClaims }) => {
          const claimRng = createRng(hashStr(`claims_${race.id}`));
          const { transfers, logs: claimLogs } = processClaims(race, [], s.horses, s.day, claimRng);
          
          let finalCash = s.cash + earned;
          const finalNpcStables = s.npcStables.map((stable) => {
            let cash = stableCredits[stable.id] ? stable.cash + stableCredits[stable.id] : stable.cash;
            // Add cash if sold
            for (const t of transfers) if (t.fromStableId === stable.id) cash += t.price;
            // Subtract cash if bought
            for (const t of transfers) if (t.toStableId === stable.id) cash -= t.price;
            return { ...stable, cash };
          });

          for (const t of transfers) {
            if (!t.fromStableId) finalCash += t.price; // Player sold
            if (!t.toStableId) finalCash -= t.price; // Player bought
          }

          const finalHorses = s.horses.map(h => {
            const t = transfers.find(tr => tr.horseId === h.id);
            if (t) {
              return { ...h, stableId: t.toStableId || undefined, owned: !t.toStableId };
            }
            return h;
          });

          const photoNote = photoFinish ? " Photo finish" : "";
          const combinedLogs = [
            { day: s.day, text: `${race.name} — ${summary}${earned ? ` (won $${earned.toLocaleString()})` : ""}${photoNote}` },
            ...claimLogs.map(text => ({ day: s.day, text })),
            ...s.log,
          ].slice(0, 50);

          set({
            races: [...s.races],
            horses: finalHorses,
            cash: finalCash,
            npcStables: finalNpcStables,
            paceSamples: samples,
            log: combinedLogs,
          });

          // Payout 10% of winnings and riding fee to jockeys
          const finalJockeys = [...s.jockeys];
          for (const r of ranked) {
            if (r.dnf || r.position > splits.length) continue;
            const raceEntry = race.entries.find(e => e.horseId === r.horseId);
            if (!raceEntry?.jockeyId) continue;
            
            const jIndex = finalJockeys.findIndex(j => j.id === raceEntry.jockeyId);
            if (jIndex === -1) continue;

            const jockey = { ...finalJockeys[jIndex] };
            const winAmount = splits[r.position - 1];
            const jockeyFee = Math.round(winAmount * 0.1);
            
            jockey.careerStarts += 1;
            if (r.position === 1) jockey.careerWins += 1;
            
            // Update jockey fame based on result
            if (r.position === 1) jockey.fame = Math.min(100, jockey.fame + 2);
            else if (r.position <= 3) jockey.fame = Math.min(100, jockey.fame + 0.5);

            finalJockeys[jIndex] = jockey;

            if (raceEntry.owned) {
              finalCash -= jockeyFee;
            } else if (raceEntry.stableId) {
              const sIndex = finalNpcStables.findIndex(st => st.id === raceEntry.stableId);
              if (sIndex !== -1) {
                finalNpcStables[sIndex] = { 
                  ...finalNpcStables[sIndex], 
                  cash: finalNpcStables[sIndex].cash - jockeyFee 
                };
              }
            }
          }

          set({
            races: [...s.races],
            horses: finalHorses,
            cash: finalCash,
            npcStables: finalNpcStables,
            jockeys: finalJockeys,
            paceSamples: samples,
            log: combinedLogs,
          });
        });
      },

      breed: (sireId, damId, liveFoalGuarantee = false) => {
        const s = get();
        const sire = s.horses.find((h) => h.id === sireId);
        const dam = s.horses.find((h) => h.id === damId);
        const fail = (reason: string): ActionResult => {
          set({ log: [{ day: s.day, text: `Breeding: ${reason}` }, ...s.log].slice(0, 50) });
          return { ok: false, reason };
        };

        const eligibility: BreedResult = canBreed(sire, dam, s.day, s.pregnancies);
        if (!eligibility.ok) return fail(eligibility.reason);

        // External-stallion path: if the sire belongs to an NPC stable, charge
        // the player the stud fee (in addition to base breeding fee), credit
        // the stable, and increment the stallion's season-bookings counter.
        const isExternal = !!sire!.stableId;
        let studFee = 0;
        if (isExternal) {
          if (!sire!.stud?.atStud) return fail(`${sire!.name} is not standing at stud.`);
          if (sire!.stud.seasonBookings >= sire!.stud.bookSize) {
            return fail(`${sire!.name}'s book is full this season.`);
          }
          if (sire!.hemisphere !== dam!.hemisphere) {
            return fail("Cross-hemisphere breeding is not supported.");
          }
          studFee = sire!.stud.standingFee;
        }

        const totalFee = BREEDING_FEE + (liveFoalGuarantee ? LIVE_FOAL_GUARANTEE_FEE : 0) + studFee;
        if (s.cash < totalFee) return fail("Insufficient cash for breeding fee.");

        const dueDay = s.day + GESTATION_DAYS;
        const preg: Pregnancy = {
          id: generateUUID(),
          sireId, damId,
          sireName: sire!.name, damName: dam!.name,
          conceivedDay: s.day,
          dueDay,
          resolved: false,
          liveFoalGuarantee,
          reBreedingAttempts: 0,
          refunded: false,
        };

        // Apply state changes: deduct player cash, credit stable cash if any,
        // bump stallion's seasonBookings, append pregnancy.
        const updatedHorses = s.horses.map((h) => {
          if (isExternal && h.id === sire!.id && h.stud) {
            return {
              ...h,
              stud: { ...h.stud, seasonBookings: h.stud.seasonBookings + 1 },
            };
          }
          return h;
        });
        const updatedStables = isExternal
          ? s.npcStables.map((stable) =>
              stable.id === sire!.stableId ? { ...stable, cash: stable.cash + studFee } : stable
            )
          : s.npcStables;

        set({
          cash: s.cash - totalFee,
          horses: updatedHorses,
          npcStables: updatedStables,
          pregnancies: [preg, ...s.pregnancies],
          log: [
            { day: s.day, text: `Mated ${sire!.name} × ${dam!.name} (foal due day ${dueDay}). Fee $${totalFee.toLocaleString()}${studFee ? ` (incl. $${studFee.toLocaleString()} stud fee)` : ""}${liveFoalGuarantee ? " (Live Foal Guarantee)" : ""}.` },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      retireToStud: (horseId, fee, bookSize) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        const fail = (reason: string): ActionResult => {
          set({ log: [{ day: s.day, text: `Retire to stud: ${reason}` }, ...s.log].slice(0, 50) });
          return { ok: false, reason };
        };
        if (!horse) return fail("Horse not found.");
        if (!horse.owned) return fail("You don't own this horse.");
        if (horse.gender !== "horse" && horse.gender !== "colt") return fail("Only colts and horses can be retired to stud.");
        if (horse.age < 4) return fail("Stallions must be age 4+ to retire to stud.");
        if (horse.stud?.atStud) return fail("Already standing at stud.");
        // Block retirement if entered in any unresolved race
        const enteredRaces = s.races.filter((r) => !r.resolved && r.entries.some((e) => e.horseId === horseId));
        if (enteredRaces.length > 0) return fail("Withdraw from upcoming races before retiring.");

        const updatedHorses = s.horses.map((h) =>
          h.id === horseId
            ? {
                ...h,
                stud: {
                  atStud: true,
                  standingFee: Math.max(500, fee),
                  bookSize: Math.max(20, Math.min(250, bookSize)),
                  seasonBookings: 0,
                  lifetimeFoals: 0,
                  lifetimeStakesFoals: 0,
                  lifetimeG1Foals: 0,
                  retiredOnDay: s.day,
                },
              }
            : h
        );
        set({
          horses: updatedHorses,
          log: [{ day: s.day, text: `${horse.name} retired to stud at $${fee.toLocaleString()} (book ${bookSize}).` }, ...s.log].slice(0, 50),
        });
        return { ok: true };
      },

      hireJockey: (jockeyId) => {
        const s = get();
        const jockey = s.jockeys.find(j => j.id === jockeyId);
        if (!jockey) return { ok: false, reason: "Jockey not found." };
        if (jockey.stableId) return { ok: false, reason: "Jockey is already under contract." };
        
        const signOnBonus = jockey.ridingFee * 30; // 30 races worth for player retainer
        if (s.cash < signOnBonus) return { ok: false, reason: `Insufficient cash. Sign-on bonus is $${signOnBonus.toLocaleString()}.` };

        set({
          cash: s.cash - signOnBonus,
          jockeys: s.jockeys.map(j => j.id === jockeyId ? { ...j, contractUntil: s.day + 90 } : j), // stableId undefined means player
          log: [{ day: s.day, text: `Signed ${jockey.name} to a 90-day retainer for $${signOnBonus.toLocaleString()}.` }, ...s.log].slice(0, 50),
        });
        return { ok: true };
      },

      assignJockey: (raceId, horseId, jockeyId) => {
        const s = get();
        const race = s.races.find(r => r.id === raceId);
        if (!race) return { ok: false, reason: "Race not found." };
        const entry = race.entries.find(e => e.horseId === horseId);
        if (!entry) return { ok: false, reason: "Horse not entered in this race." };
        
        const jockey = s.jockeys.find(j => j.id === jockeyId);
        if (!jockey) return { ok: false, reason: "Jockey not found." };

        // Check if jockey already has a mount in this race
        if (race.entries.some(e => e.jockeyId === jockeyId && e.horseId !== horseId)) {
          return { ok: false, reason: `${jockey.name} is already riding another horse in this race.` };
        }

        // Deduct riding fee
        if (s.cash < jockey.ridingFee) return { ok: false, reason: "Insufficient cash for riding fee." };

        const updatedRaces = s.races.map(r => 
          r.id === raceId 
            ? { ...r, entries: r.entries.map(e => e.horseId === horseId ? { ...e, jockeyId } : e) }
            : r
        );

        set({
          races: updatedRaces,
          cash: s.cash - jockey.ridingFee,
          log: [{ day: s.day, text: `Assigned ${jockey.name} to horse for $${jockey.ridingFee.toLocaleString()}.` }, ...s.log].slice(0, 50),
        });
        return { ok: true };
      },

      scoutHorse: (horseId) => {
        const s = get();
        const horse = s.horses.find(h => h.id === horseId);
        if (!horse) {
          return { success: false, cost: 0, message: "Horse not found." };
        }
        if (!horse.stableId) {
          return { success: false, cost: 0, message: "Cannot scout your own horses." };
        }
        const stable = s.npcStables.find(st => st.id === horse.stableId);
        if (!stable) {
          return { success: false, cost: 0, message: "Stable not found." };
        }
        
        const scoutRng = createRng(hashStr(`scout_${horseId}_${s.day}`));
        const result = performScout(horse, stable, s.day, s.cash, scoutRng);
        
        if (result.success && result.report) {
          const report = result.report;
          // Deduct cost and save report
          const updatedHorses = s.horses.map(h => 
            h.id === horseId 
              ? { ...h, scoutedStats: report.revealedStats, lastScoutedDay: s.day }
              : h
          );
          set({
            horses: updatedHorses,
            cash: s.cash - result.cost,
            scoutReports: [report, ...s.scoutReports],
            log: [{ day: s.day, text: result.message }, ...s.log].slice(0, 50),
          });
        }
        
        return result;
      },

      advanceDay: () => {
        const s = get();
        // Headless-resolve any unresolved races whose day <= today
        const overdueRaces = s.races.filter((r) => !r.resolved && r.day <= s.day);
        for (const race of overdueRaces) {
        const { runners, fillerHorses } = buildRaceField({ race, horses: s.horses, jockeys: s.jockeys });
          // Persist filler horses so resolveRace can find them by ID
          if (fillerHorses.length > 0) {
            for (const fh of fillerHorses) {
              s.horses.push(fh);
              race.entries.push({ horseId: fh.id, owned: false, npc: true });
            }
          }
          const rng = rngForRace(race);
          const track = TRACKS.find(t => t.id === race.graded?.trackId || t.id === race.trackId);
          const surface = (race.surface || race.graded?.surface || "Turf") as any;
          const course = track?.courses.find(c => c.surface === surface);
          
          const result = runRaceToCompletion(runners, race.distance, rng, 0.1, 600, course);
          get().resolveRace(race.id, result, runners);
        }
        
        const newDay = s.day + 1;
        const playerHorseCount = s.horses.filter((h) => !h.stableId).length;
        const playerUpkeep = playerHorseCount * UPKEEP_PER_HORSE;

        // Execute pipeline for all phases. The upkeep phase deducts both
        // player and NPC-stable cash so the economy is symmetric.
        const pipelineContext: PipelineContext = {
          previousDay: s.day,
          newDay,
          state: s,
          logs: [],
          dailyRng: createRng(hashStr("daily_" + newDay)),
        };

        const phases = [
          upkeepPhase,
          agingPhase,
          breedingSeasonPhase,
          npcBreedingPhase,
          energyPhase,
          marketPhase,
          racesPhase,
          beyerRecalibrationPhase,
          jockeyPhase,
          pregnancyPhase,
          npcCyclePhase,
          auctionsPhase,
          awardsPhase,
          stateUpdatePhase,
        ];

        const updatedContext = executePipeline(phases, pipelineContext);

        // Extract final state from pipeline context
        const { state: finalState, logs: newLogs } = updatedContext;

        set({
          day: newDay,
          cash: finalState.cash,
          horses: finalState.horses,
          market: finalState.market,
          races: finalState.races,
          trainingUsed: {},
          pregnancies: finalState.pregnancies,
          calibratedPars: finalState.calibratedPars,
          lastCalibrationDay: finalState.lastCalibrationDay,
          npcStables: finalState.npcStables,
          scoutReports: finalState.scoutReports,
          auctions: finalState.auctions,
          awards: finalState.awards,
          lastAwardYear: finalState.lastAwardYear,
          pendingAwardCeremonies: finalState.pendingAwardCeremonies,
          industryMeanEarnings: finalState.industryMeanEarnings,
          industryEarningsUpdatedDay: finalState.industryEarningsUpdatedDay,
          log: [...newLogs, { day: newDay, text: `Day ${newDay} begins. Upkeep: $${playerUpkeep}.` }, ...s.log].slice(0, 50),
        });
      },

      advanceMultipleDays: (n: number, headless = false) => {
        const s = get();
        // Pre-compute player race days for O(1) lookup
        const playerRaceDays = computePlayerRaceDays(s.races, s.day + 1, s.day + n);
        
        for (let i = 0; i < n; i++) {
          const currentS = get();
          const nextDay = currentS.day + 1;
          
          // O(1) lookup instead of O(n) array.find
          if (playerRaceDays.has(nextDay) && !headless) {
            const playerRace = currentS.races.find(
              (r) => !r.resolved && r.day === nextDay && r.entries.some((e) => e.owned)
            );
            if (playerRace) {
              set({ pendingPlayerRaceId: playerRace.id });
              return;
            }
          }
          
          if (playerRaceDays.has(nextDay) && headless) {
            const playerRace = currentS.races.find(
              (r) => !r.resolved && r.day === nextDay && r.entries.some((e) => e.owned)
            );
            if (playerRace) {
              const { runners, fillerHorses } = buildRaceField({ race: playerRace, horses: currentS.horses, jockeys: currentS.jockeys });
              // Persist filler horses so resolveRace can find them by ID
              if (fillerHorses.length > 0) {
                for (const fh of fillerHorses) {
                  currentS.horses.push(fh);
                  playerRace.entries.push({ horseId: fh.id, owned: false, npc: true });
                }
              }
              const track = TRACKS.find(t => t.id === playerRace.graded?.trackId || t.id === playerRace.trackId);
              const surface = (playerRace.surface || playerRace.graded?.surface || "Turf") as any;
              const course = track?.courses.find(c => c.surface === surface);
              
              const result = runRaceToCompletion(runners, playerRace.distance, rngForRace(playerRace), 0.1, 600, course);
              get().resolveRace(playerRace.id, result, runners);
            }
          }
          get().advanceDay();
        }
      },

      advanceWeek: (headless = false) => {
        get().advanceMultipleDays(7, headless);
      },

      advanceMonth: (headless = false) => {
        get().advanceMultipleDays(30, headless);
      },

      advanceYear: (headless = false) => {
        get().advanceMultipleDays(365, headless);
      },

      consignHorse: (horseId: string, saleId: string) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
        if (horse.consignedSaleId) return { ok: false, reason: "Already consigned to a sale." };
        const sale = (s.auctions ?? []).find((a) => a.id === saleId);
        if (!sale) return { ok: false, reason: "Sale not found." };
        if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
        set({
          horses: s.horses.map((h) => h.id === horseId ? { ...h, consignedSaleId: saleId } : h),
          auctions: (s.auctions ?? []).map((a) =>
            a.id === saleId
              ? {
                  ...a,
                  lots: [
                    ...a.lots,
                    {
                      id: generateUUID(),
                      horseId,
                      consignorStableId: undefined,
                      saleId,
                      reservePrice: Math.round(horsePriceWithPedigree(horse, s.horses) * 0.7),
                      passed: false,
                      withdrawn: false,
                    },
                  ],
                }
              : a
          ),
          log: [{ day: s.day, text: `${horse.name} consigned to ${sale.name}.` }, ...s.log].slice(0, 50),
        });
        return { ok: true };
      },

      withdrawConsignment: (horseId: string) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.consignedSaleId) return { ok: false, reason: "Horse is not consigned." };
        const sale = (s.auctions ?? []).find((a) => a.id === horse.consignedSaleId);
        if (sale && sale.day - s.day < 3) return { ok: false, reason: "Cannot withdraw within 3 days of the sale." };
        set({
          horses: s.horses.map((h) => h.id === horseId ? { ...h, consignedSaleId: undefined } : h),
          auctions: (s.auctions ?? []).map((a) =>
            a.id === horse.consignedSaleId
              ? { ...a, lots: a.lots.map((l) => l.horseId === horseId ? { ...l, withdrawn: true } : l) }
              : a
          ),
        });
        return { ok: true };
      },

      bidInAuction: (saleId: string, lotId: string, amount: number) => {
        const s = get();
        const sale = (s.auctions ?? []).find((a) => a.id === saleId);
        if (!sale) return { ok: false, reason: "Sale not found." };
        if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
        const lot = sale.lots.find((l) => l.id === lotId);
        if (!lot) return { ok: false, reason: "Lot not found." };
        if (lot.passed || lot.withdrawn) return { ok: false, reason: "Lot is no longer available." };
        if (amount <= (lot.hammerPrice ?? 0)) return { ok: false, reason: "Bid must exceed current price." };
        if (s.cash < amount) return { ok: false, reason: "Insufficient funds." };
        set({
          auctions: (s.auctions ?? []).map((a) =>
            a.id === saleId
              ? { ...a, lots: a.lots.map((l) => l.id === lotId ? { ...l, hammerPrice: amount, soldToStableId: undefined } : l) }
              : a
          ),
        });
        return { ok: true };
      },

      clearPendingCeremonies: () => {
        set({
          pendingAwardCeremonies: [],
          currentCeremonyIndex: 0,
        });
      },
      
      geldingHorse: (horseId: string) => {
        const s = get();
        const horse = s.horses.find(h => h.id === horseId);
        const cost = 500;
        
        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
        if (horse.gender === "gelding" || horse.gender === "filly" || horse.gender === "mare") {
          return { ok: false, reason: "Only colts and stallions can be gelded." };
        }
        if (s.cash < cost) return { ok: false, reason: `Insufficient funds ($${cost} required).` };
        
        // Block if entered in a race
        const isEntered = s.races.some(r => !r.resolved && r.entries.some(e => e.horseId === horseId));
        if (isEntered) return { ok: false, reason: "Withdraw from races before gelding." };

        const updatedHorses = s.horses.map(h => {
          if (h.id === horseId) {
            return {
              ...h,
              gender: "gelding" as const,
              energy: Math.max(0, h.energy - 50), // Significant recovery needed
              stats: {
                ...h.stats,
                consistency: Math.min(100, h.stats.consistency + 5) // Permanent consistency boost
              }
            };
          }
          return h;
        });

        set({
          horses: updatedHorses,
          cash: s.cash - cost,
          log: [{ day: s.day, text: `${horse.name} has been gelded. Recovery will take some time, but they should be more consistent now.` }, ...s.log].slice(0, 50)
        });
        
        return { ok: true };
      },

      renameHorse: (horseId: string, newName: string) => {
        const s = get();
        const horse = s.horses.find(h => h.id === horseId);
        
        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
        if (!newName || newName.trim().length === 0) return { ok: false, reason: "Name cannot be empty." };
        if (newName.length > 50) return { ok: false, reason: "Name too long (max 50 characters)." };
        
        set({
          horses: s.horses.map(h => (h.id === horseId ? { ...h, name: newName.trim() } : h)),
          log: [{ day: s.day, text: `${horse.name} has been renamed to ${newName.trim()}.` }, ...s.log].slice(0, 50)
        });
        
        return { ok: true };
      }
    }),
    {
      name: "horse-racing-game-v1",
      storage: opfsStorage,
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
