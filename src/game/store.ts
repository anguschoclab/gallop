import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Horse, Race, Pregnancy, ScoutReport, AuctionSale, GameState, HorseCampaign, CampaignGoalType, ConfirmedAptitudes } from "./types";
import { GRADED_RACES } from "./gradedRaces";
import { generateHorse, horsePrice, generateRace, makeGradedRace, horsePriceWithPedigree } from "./horseGen";
import { generateInitialJockeys, generateSilk } from "./jockeyGen";
import { generateAllStables } from "./npcStables";
import { generateAllNpcHorses } from "./npcHorseGen";
import { runNpcRaceEntry, runNpcTraining, updateHorseFame } from "./npcRaceEntry";
import { isHorseEligibleForRace } from "@/core/race/eligibility";
import { calculateOverallRating } from "@/core/horse/stats";
import { createRng, hashStr, type Rng } from "./rng";
import { generateUpcomingRaces as generateScheduledRaces, getCurrentYear } from "./raceSchedule";
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
import { isHorseEligibleForClaimingPrice } from "./claiming";
import { industryMetricsPhase } from "@/core/time/phases/industryMetricsPhase";
import { leaderboardPhase } from "@/core/time/phases/leaderboardPhase";
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
import { schedulerPhase } from "@/core/time/phases/schedulerPhase";
import { intentCollectionPhase } from "@/core/time/phases/intentCollection";
import { intentValidationPhase } from "@/core/time/phases/intentValidation";
import { raceEntryResolutionPhase } from "@/core/time/phases/raceEntryResolution";
import { purchaseResolutionPhase } from "@/core/time/phases/purchaseResolution";
import { breedingResolutionPhase } from "@/core/time/phases/breedingResolution";
import { trainingResolutionPhase } from "@/core/time/phases/trainingResolution";
import { auctionResolutionPhase } from "@/core/time/phases/auctionResolution";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { impactApplicationPhase } from "@/core/time/phases/impactApplication";
import { computePlayerRaceDays, advanceMultipleDaysWithRaceDetection } from "@/core/time/advance";
import { calculateClassBonus } from "@/core/common/classBonus";
import { updateBlueHenStatus } from "./helpers/blueHenHelpers";
import { applyImpacts, type ResolverContext } from "@/core/resolver/resolver";
import type { RenameIntent, AnyIntent, TrainingIntent, RaceEntryIntent, BreedingIntent, PurchaseIntent } from "@/core/resolver/intents";
import type { RenameImpact, EnergyImpact, FormImpact, FameImpact, RaceHistoryImpact, CashImpact, BlueHenImpact, StudCareerImpact, PaceSampleImpact, JockeyStatsImpact, LogImpact } from "@/core/resolver/impacts";

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

type RankedResult = { horseId: string; position: number; time: number; dnf: boolean };

function sanitizeAndRankResults(
  rawResult: { horseId: string; time: number }[],
  raceId: string
): { ranked: RankedResult[]; finishers: RankedResult[]; dnfs: RankedResult[] } {
  const tieRng = createRng(hashStr(raceId) ^ 0x7e57);
  const enriched = rawResult.map((r) => ({ ...r, dnf: !Number.isFinite(r.time) || r.time <= 0 }));
  const finishersRaw = enriched.filter((r) => !r.dnf).sort((a, b) => {
    if (a.time === b.time) return tieRng.next() - 0.5;
    return a.time - b.time;
  });
  const finishers = finishersRaw.map((r, idx) => ({ ...r, position: idx + 1 }));
  const dnfs = enriched.filter((r) => r.dnf).map((r, idx) => ({ ...r, position: finishersRaw.length + idx + 1 }));
  const ranked = [...finishers, ...dnfs];
  return { ranked, finishers, dnfs };
}

function detectPhotoFinish(finishers: RankedResult[]): boolean {
  for (let i = 1; i < finishers.length; i++) {
    if (Math.abs(finishers[i].time - finishers[i - 1].time) < 0.05) {
      return true;
    }
  }
  return false;
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
  return races.filter((r) => {
    if (r.graded) return true;
    if (!r.resolved) return true;
    return r.day > newDay - 30;
  });
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
  resolveRaceWithImpacts: (raceId: string, result: { horseId: string; position: number; time: number }[], runners?: import("./raceSim").Runner[]) => void;
  submitClaim: (raceId: string, horseId: string) => ActionResult;
  breed: (sireId: string, damId: string, liveFoalGuarantee?: boolean) => ActionResult;
  retireToStud: (horseId: string, fee: number, bookSize: number) => ActionResult;
  hireJockey: (jockeyId: string) => ActionResult;
  rerollJockeySilk: (jockeyId: string) => ActionResult;
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
  enqueueIntent: (intent: AnyIntent) => void;
  setCampaign: (campaign: HorseCampaign) => void;
  updateCampaignSlot: (horseId: string, slotIndex: number, patch: Partial<HorseCampaign["slots"][number]>) => void;
  dismissCampaignFlag: (horseId: string, flagIndex: number) => void;
  deleteCampaign: (horseId: string) => void;
  generateAutoCampaign: (horseId: string, goalType: CampaignGoalType, targetRaceKey?: string) => void;
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
        if (!horse.owned) return;
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
          // Rest is immediate, not queued
          horse.energy = Math.min(100, horse.energy + 30);
          set({
            horses: [...s.horses],
            trainingUsed: { ...s.trainingUsed, [horseId]: usedToday + 1 },
          });
        } else {
          const cost = 75;
          if (s.cash < cost) return;
          if (horse.energy < 15) return;

          // Enqueue TrainingIntent for next day advance
          const intent: TrainingIntent = {
            id: generateUUID(),
            entityId: horseId,
            source: "player",
            day: s.day,
            priority: 100,
            type: "training",
            horseId,
            trainingType: kind,
          };

          get().enqueueIntent(intent);

          set({
            cash: s.cash - cost,
            trainingUsed: { ...s.trainingUsed, [horseId]: usedToday + 1 },
            log: [{ day: s.day, text: `${horse.name} scheduled for ${kind} training.` }, ...s.log].slice(0, 50),
          });
        }
      },

      buyHorse: (horseId) => {
        const s = get();
        const h = s.market.find((m) => m.id === horseId);
        if (!h) return;
        const price = horsePrice(h);
        if (s.cash < price) return;

        // Enqueue PurchaseIntent for next day advance
        const intent: PurchaseIntent = {
          id: generateUUID(),
          entityId: horseId,
          source: "player",
          day: s.day,
          priority: 100,
          type: "purchase",
          horseId,
          price,
        };

        get().enqueueIntent(intent);

        // Deduct cash immediately
        set({
          cash: s.cash - price,
          log: [{ day: s.day, text: `${h.name} purchase scheduled for $${price.toLocaleString()}.` }, ...s.log].slice(0, 50),
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

        // Check if horse has entry fee waiver for this race
        let effectiveEntryFee = race.entryFee;
        if (race.graded?.key && horse.winAndYouInQualified) {
          const currentYear = getCurrentYear(s.day);
          const hasWaiver = horse.winAndYouInQualified.some(q => q.raceKey === race.graded!.key && q.year === currentYear);
          if (hasWaiver) {
            effectiveEntryFee = 0;
          }
        }

        if (s.cash < effectiveEntryFee) return fail("Insufficient cash for entry fee.");
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

        // Enqueue RaceEntryIntent for next day advance
        const intent: RaceEntryIntent = {
          id: generateUUID(),
          entityId: raceId,
          source: "player",
          day: s.day,
          priority: 100,
          type: "race_entry",
          raceId,
          horseId,
        };

        get().enqueueIntent(intent);

        set({
          cash: s.cash - effectiveEntryFee,
          log: [{ day: s.day, text: `${horse.name} scheduled to enter ${race.name}.` }, ...s.log].slice(0, 50),
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

      resolveRaceWithImpacts: (raceId: string, result: { horseId: string; position: number; time: number }[], runners: Runner[] = []) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race || race.resolved) return;

        const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);
        const impacts: any[] = [];

        // Mark race as resolved
        race.resolved = true;
        race.result = result.map(({ horseId, position, time }) => ({ horseId, position, time }));

        // Generate per-horse impacts
        for (const r of result) {
          const horse = s.horses.find((h) => h.id === r.horseId);
          if (!horse) continue;

          const runner = runners.find((run) => run.horseId === r.horseId);

          // Energy impact (-25)
          impacts.push({
            id: crypto.randomUUID(),
            intentId: "",
            day: s.day,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "energy_change",
            horseId: horse.id,
            delta: -25,
            reason: "Race energy expenditure",
          } as EnergyImpact);

          // Form impact based on position
          const formDelta = r.position === 1 ? 3 : r.position === 2 ? 2 : r.position === 3 ? 1 : r.position <= 5 ? 0 : -1;
          impacts.push({
            id: crypto.randomUUID(),
            intentId: "",
            day: s.day,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "form_change",
            horseId: horse.id,
            delta: formDelta,
            reason: `Race position: ${r.position}`,
          } as FormImpact);

          // Fame impact based on position
          const fameDelta = r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0;
          if (fameDelta > 0) {
            impacts.push({
              id: crypto.randomUUID(),
              intentId: "",
              day: s.day,
              phase: "raceResolution",
              logLevel: "conditional",
              type: "fame_change",
              horseId: horse.id,
              delta: fameDelta,
              reason: `Race position: ${r.position}`,
            } as FameImpact);
          }

          // Beyer calculation with inbreeding dampener
          const beyer = beyerFigure({ distance: race.distance, finishTime: r.time, classBonus });
          const inbreedingPattern = detectInbreedingPattern(horse.pedigree);
          const dampener = inbreedingPerformanceDampener(inbreedingPattern);
          const adjustedBeyer = Math.max(0, beyer - dampener);

          // Win and You're In qualification
          let winAndYouInQualified = undefined;
          if (r.position === 1 && race.graded?.winAndYouInTarget) {
            const currentYear = getCurrentYear(s.day);
            winAndYouInQualified = { year: currentYear, raceId: race.id, raceKey: race.graded.winAndYouInTarget };
          }

          // Race history impact
          impacts.push({
            id: crypto.randomUUID(),
            intentId: "",
            day: s.day,
            phase: "raceResolution",
            logLevel: "always",
            type: "race_history",
            horseId: horse.id,
            raceHistoryEntry: {
              raceId: race.id,
              raceName: race.name,
              position: r.position,
              day: s.day,
              beyer: adjustedBeyer,
              grade: race.graded?.grade,
              distance: race.distance,
              surface: race.graded?.surface,
              purse: race.purse,
              fieldSize: result.length,
              raceClass: race.raceClass,
              barrier: runner?.barrier,
              lane: runner?.lane,
              winAndYouInQualified,
            },
            reason: "Race completed",
          } as RaceHistoryImpact);

          // Prize money impact
          if (r.position - 1 < PRIZE_SPLIT.length) {
            const prize = Math.round(race.purse * PRIZE_SPLIT[r.position - 1]);
            if (prize > 0) {
              if (horse.stableId) {
                // NPC stable gets prize money
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: "",
                  day: s.day,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: horse.stableId,
                  amount: prize,
                  reason: `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
                } as CashImpact);
              } else {
                // Player gets prize money
                impacts.push({
                  id: crypto.randomUUID(),
                  intentId: "",
                  day: s.day,
                  phase: "raceResolution",
                  logLevel: "conditional",
                  type: "cash_change",
                  entityId: "",
                  amount: prize,
                  reason: `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
                } as CashImpact);
              }
            }
          }

          // Blue hen impact for graded stakes winners
          if (r.position === 1 && (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")) {
            const dam = s.horses.find((h) => h.id === horse.pedigree?.damId);
            if (dam) {
              impacts.push({
                id: crypto.randomUUID(),
                intentId: "",
                day: s.day,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "blue hen_status",
                horseId: dam.id,
                blueHenStatus: {
                  isBlueHen: dam.blueHenStatus?.isBlueHen || false,
                  stakesWinnersProduced: (dam.blueHenStatus?.stakesWinnersProduced ?? 0) + 1,
                  group1WinnersProduced: race.graded?.grade === "G1" ? (dam.blueHenStatus?.group1WinnersProduced ?? 0) + 1 : dam.blueHenStatus?.group1WinnersProduced,
                  blueHenScore: dam.blueHenStatus?.blueHenScore || 0,
                  foalsProduced: dam.blueHenStatus?.foalsProduced || 0,
                },
                reason: `Stakes win by ${horse.name}`,
              } as BlueHenImpact);
            }

            // Stud career impact for sire
            const sire = s.horses.find((h) => h.id === horse.pedigree?.sireId);
            if (sire && sire.stud?.atStud) {
              impacts.push({
                id: crypto.randomUUID(),
                intentId: "",
                day: s.day,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "stud_career",
                horseId: sire.id,
                studCareer: {
                  atStud: sire.stud.atStud,
                  standingFee: sire.stud.standingFee,
                  bookSize: sire.stud.bookSize,
                  seasonBookings: sire.stud.seasonBookings,
                  lifetimeFoals: sire.stud.lifetimeFoals,
                  lifetimeStakesFoals: (sire.stud.lifetimeStakesFoals ?? 0) + 1,
                  lifetimeG1Foals: race.graded?.grade === "G1" ? (sire.stud.lifetimeG1Foals ?? 0) + 1 : sire.stud.lifetimeG1Foals,
                },
                reason: `Stakes win by ${horse.name}`,
              } as StudCareerImpact);
            }
          }

          // Jockey stats impact
          const raceEntry = race.entries.find((e) => e.horseId === horse.id);
          if (raceEntry?.jockeyId && r.position - 1 < PRIZE_SPLIT.length) {
            const jockey = s.jockeys?.find((j) => j.id === raceEntry.jockeyId);
            if (jockey) {
              const winAmount = PRIZE_SPLIT[r.position - 1] * race.purse;
              const jockeyFee = Math.round(winAmount * 0.1);

              impacts.push({
                id: crypto.randomUUID(),
                intentId: "",
                day: s.day,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "jockey_stats",
                jockeyId: jockey.id,
                careerStarts: jockey.careerStarts + 1,
                careerWins: jockey.careerWins + (r.position === 1 ? 1 : 0),
                fame: Math.min(100, jockey.fame + (r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0)),
                reason: `Rode ${horse.name} to ${r.position}${getOrdinalSuffix(r.position)}`,
              } as JockeyStatsImpact);

              // Jockey fee impact
              if (jockeyFee > 0) {
                if (raceEntry.owned) {
                  impacts.push({
                    id: crypto.randomUUID(),
                    intentId: "",
                    day: s.day,
                    phase: "raceResolution",
                    logLevel: "conditional",
                    type: "cash_change",
                    entityId: "",
                    amount: -jockeyFee,
                    reason: `Jockey fee for ${jockey.name}`,
                  } as CashImpact);
                } else if (raceEntry.stableId) {
                  impacts.push({
                    id: crypto.randomUUID(),
                    intentId: "",
                    day: s.day,
                    phase: "raceResolution",
                    logLevel: "conditional",
                    type: "cash_change",
                    entityId: raceEntry.stableId,
                    amount: -jockeyFee,
                    reason: `Jockey fee for ${jockey.name}`,
                  } as CashImpact);
                }
              }
            }
          }
        }

        // Pace sample impact for winner
        if (result.length > 0) {
          const winner = result[0];
          impacts.push({
            id: crypto.randomUUID(),
            intentId: "",
            day: s.day,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "pace_sample",
            distance: race.distance,
            time: winner.time,
            reason: `Pace sample from ${race.name}`,
          } as PaceSampleImpact);
        }

        // Log impact for race summary
        const ownedHorses = result.filter((r) => {
          const horse = s.horses.find((h) => h.id === r.horseId);
          return horse && !horse.stableId;
        });
        if (ownedHorses.length > 0) {
          const summary = ownedHorses.map((r) => {
            const horse = s.horses.find((h) => h.id === r.horseId);
            return `${horse?.name} ${r.position}${getOrdinalSuffix(r.position)}`;
          }).join(", ");
          const prize = ownedHorses.reduce((sum, r) => {
            if (r.position - 1 < PRIZE_SPLIT.length) {
              return sum + Math.round(race.purse * PRIZE_SPLIT[r.position - 1]);
            }
            return sum;
          }, 0);
          impacts.push({
            id: crypto.randomUUID(),
            intentId: "",
            day: s.day,
            phase: "raceResolution",
            logLevel: "always",
            type: "log",
            text: `${race.name} — ${summary}${prize > 0 ? ` (won $${prize.toLocaleString()})` : ""}`,
            reason: "Race summary",
          } as LogImpact);
        }

        // Apply impacts to state
        const resolverContext: ResolverContext = {
          state: s,
          intents: [],
          impacts,
          impactLog: [],
          day: s.day,
        };
        const newState = applyImpacts(resolverContext);

        set({
          races: [...s.races],
          ...newState,
        });
      },

      submitClaim: (raceId, horseId) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        const horse = s.horses.find((h) => h.id === horseId);
        
        if (!race) return { ok: false, reason: "Race not found" };
        if (!horse) return { ok: false, reason: "Horse not found" };
        if (!race.claimingPrice) return { ok: false, reason: "Race is not a claiming race" };
        if (!race.entries.some((e) => e.horseId === horseId)) {
          return { ok: false, reason: "Horse is not entered in this race" };
        }
        if (horse.stableId === undefined) {
          return { ok: false, reason: "Cannot claim your own horse" };
        }
        if (s.cash < race.claimingPrice) {
          return { ok: false, reason: `Insufficient funds (need $${race.claimingPrice.toLocaleString()})` };
        }
        
        // Check horse eligibility
        if (!isHorseEligibleForClaimingPrice(horse, race.claimingPrice, s.horses)) {
          return { ok: false, reason: "Horse is not eligible for this claiming price" };
        }
        
        // Enqueue ClaimingIntent
        s.enqueueIntent({
          id: generateUUID(),
          entityId: horseId,
          source: "player",
          day: s.day,
          priority: 100, // Player claims have higher priority
          type: "claiming",
          raceId,
          horseId,
          claimingPrice: race.claimingPrice,
        });
        
        return { ok: true };
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

        // Enqueue BreedingIntent for next day advance
        const intent: BreedingIntent = {
          id: generateUUID(),
          entityId: damId,
          source: "player",
          day: s.day,
          priority: 100,
          type: "breeding",
          sireId,
          damId,
          liveFoalGuarantee,
        };

        get().enqueueIntent(intent);

        // Deduct cash immediately
        set({
          cash: s.cash - totalFee,
          log: [
            { day: s.day, text: `${sire!.name} × ${dam!.name} breeding scheduled. Fee $${totalFee.toLocaleString()}${studFee ? ` (incl. $${studFee.toLocaleString()} stud fee)` : ""}${liveFoalGuarantee ? " (Live Foal Guarantee)" : ""}.` },
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
        const jockey = s.jockeys?.find(j => j.id === jockeyId);
        if (!jockey) return { ok: false, reason: "Jockey not found." };
        if (jockey.stableId) return { ok: false, reason: "Jockey is already under contract." };
        
        const signOnBonus = jockey.ridingFee * 30; // 30 races worth for player retainer
        if (s.cash < signOnBonus) return { ok: false, reason: `Insufficient cash. Sign-on bonus is $${signOnBonus.toLocaleString()}.` };

        set({
          cash: s.cash - signOnBonus,
          jockeys: s.jockeys?.map(j => j.id === jockeyId ? { ...j, contractUntil: s.day + 90 } : j), // stableId undefined means player
          log: [{ day: s.day, text: `Signed ${jockey.name} to a 90-day retainer for $${signOnBonus.toLocaleString()}.` }, ...s.log].slice(0, 50),
        });
        return { ok: true };
      },

      rerollJockeySilk: (jockeyId) => {
        const s = get();
        const jockey = s.jockeys?.find(j => j.id === jockeyId);
        if (!jockey) return { ok: false, reason: "Jockey not found." };
        
        // Only allow rerolling retained jockeys (player's jockeys)
        if (!jockey.contractUntil) return { ok: false, reason: "You can only reroll silks for your retained jockeys." };
        
        const rng = createRng(hashStr(`reroll_silk_${jockeyId}_${s.day}`));
        const newSilk = generateSilk(rng);
        
        set({
          jockeys: s.jockeys?.map(j => j.id === jockeyId ? { ...j, silk: newSilk } : j),
          log: [{ day: s.day, text: `${jockey.name}'s racing silks have been updated.` }, ...s.log].slice(0, 50),
        });
        return { ok: true };
      },

      assignJockey: (raceId, horseId, jockeyId) => {
        const s = get();
        const race = s.races.find(r => r.id === raceId);
        if (!race) return { ok: false, reason: "Race not found." };
        const entry = race.entries.find(e => e.horseId === horseId);
        if (!entry) return { ok: false, reason: "Horse not entered in this race." };
        
        const jockey = (s.jockeys ?? []).find(j => j.id === jockeyId);
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
        const newDay = s.day + 1;
        const currentYear = getCurrentYear(newDay);
        const previousYear = getCurrentYear(s.day);

        // Clean up expired Win and You're In qualifications at year boundary
        if (currentYear > previousYear) {
          s.horses.forEach(h => {
            if (h.winAndYouInQualified) {
              h.winAndYouInQualified = h.winAndYouInQualified.filter(q => q.year >= currentYear);
            }
          });
        }

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
          // Intent/impact resolver fields
          intents: s.pendingIntents || [],
          impacts: [],
          impactLog: [],
        };

        const phases = [
          // Intent/impact resolver phases
          intentCollectionPhase,
          intentValidationPhase,
          // Existing phases
          upkeepPhase,
          agingPhase,
          breedingSeasonPhase,
          industryMetricsPhase,
          npcBreedingPhase,
          energyPhase,
          marketPhase,
          racesPhase,
          beyerRecalibrationPhase,
          jockeyPhase,
          pregnancyPhase,
          npcCyclePhase,
          auctionsPhase,
          leaderboardPhase,
          awardsPhase,
          schedulerPhase,
          stateUpdatePhase,
          // Resolution phases (convert intents to impacts)
          raceEntryResolutionPhase,
          purchaseResolutionPhase,
          breedingResolutionPhase,
          trainingResolutionPhase,
          auctionResolutionPhase,
          raceResolutionPhase,
          // Impact application phase (final)
          impactApplicationPhase,
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
          sireLeaderboards: finalState.sireLeaderboards,
          sireTrendHistory: finalState.sireTrendHistory,
          leaderboardsUpdatedDay: finalState.leaderboardsUpdatedDay,
          pendingIntents: [], // Clear pending intents after processing
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

        // Generate RenameIntent for immediate resolution
        const intent: RenameIntent = {
          id: generateUUID(),
          entityId: horseId,
          source: "player",
          day: s.day,
          priority: 100,
          type: "rename",
          horseId,
          newName: newName.trim(),
        };

        // Convert intent to impact
        const impact: RenameImpact = {
          id: generateUUID(),
          intentId: intent.id,
          day: s.day,
          phase: "immediate",
          logLevel: "always",
          type: "rename",
          horseId,
          newName: newName.trim(),
          reason: "Player renamed horse",
        };

        // Apply impact immediately using resolver
        const resolverContext: ResolverContext = {
          state: s,
          intents: [intent],
          impacts: [impact],
          impactLog: [],
          day: s.day,
        };

        const updatedContext = applyImpacts(resolverContext);

        set({
          horses: updatedContext.state.horses,
          log: [{ day: s.day, text: `${horse.name} has been renamed to ${newName.trim()}.` }, ...s.log].slice(0, 50),
        });

        return { ok: true };
      },

      // Helper function to enqueue intents for next day advance
      enqueueIntent: (intent: AnyIntent) => {
        const s = get();
        set({
          pendingIntents: [...(s.pendingIntents || []), intent],
        });
      },

      setCampaign: (campaign: HorseCampaign) => {
        const s = get();
        const existing = (s.campaigns ?? []).findIndex(c => c.horseId === campaign.horseId);
        const updated = existing >= 0
          ? (s.campaigns ?? []).map((c, i) => (i === existing ? campaign : c))
          : [...(s.campaigns ?? []), campaign];
        set({ campaigns: updated });
      },

      updateCampaignSlot: (horseId: string, slotIndex: number, patch: Partial<HorseCampaign["slots"][number]>) => {
        const s = get();
        set({
          campaigns: (s.campaigns ?? []).map(c =>
            c.horseId !== horseId ? c : {
              ...c,
              slots: c.slots.map((sl, i) => (i === slotIndex ? { ...sl, ...patch } : sl)),
            }
          ),
        });
      },

      dismissCampaignFlag: (horseId: string, flagIndex: number) => {
        const s = get();
        set({
          campaigns: (s.campaigns ?? []).map(c =>
            c.horseId !== horseId ? c : {
              ...c,
              flags: c.flags.map((f, i) => (i === flagIndex ? { ...f, dismissed: true } : f)),
            }
          ),
        });
      },

      deleteCampaign: (horseId: string) => {
        const s = get();
        set({ campaigns: (s.campaigns ?? []).filter(c => c.horseId !== horseId) });
      },

      generateAutoCampaign: (horseId: string, goalType: CampaignGoalType, targetRaceKey?: string) => {
        const s = get();
        const horse = s.horses.find(h => h.id === horseId);
        if (!horse) return;
        const emptyAptitudes: ConfirmedAptitudes = {
          surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
          distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
        };
        const campaign: HorseCampaign = {
          horseId,
          goalType,
          targetRaceKey,
          slots: [],
          flags: [],
          autoManaged: true,
          confirmedAptitudes: emptyAptitudes,
          createdDay: s.day,
          lastReviewedDay: s.day,
        };
        const existing = (s.campaigns ?? []).findIndex(c => c.horseId === horseId);
        const updated = existing >= 0
          ? (s.campaigns ?? []).map((c, i) => (i === existing ? campaign : c))
          : [...(s.campaigns ?? []), campaign];
        set({ campaigns: updated });
      },
    }),
    {
      name: "horse-racing-game-v1",
      storage: opfsStorage,
      skipHydration: true,
      partialize: (state) => ({
        day: state.day,
        cash: state.cash,
        horses: state.horses,
        market: state.market,
        races: state.races,
        trainingUsed: state.trainingUsed,
        log: state.log,
        pregnancies: state.pregnancies,
        paceSamples: state.paceSamples,
        calibratedPars: state.calibratedPars,
        lastCalibrationDay: state.lastCalibrationDay,
        npcStables: state.npcStables,
        scoutReports: state.scoutReports,
        auctions: state.auctions,
        jockeys: state.jockeys,
        awards: state.awards,
        lastAwardYear: state.lastAwardYear,
        pendingAwardCeremonies: state.pendingAwardCeremonies,
        currentCeremonyIndex: state.currentCeremonyIndex,
        sireLeaderboards: state.sireLeaderboards,
        sireTrendHistory: state.sireTrendHistory,
        leaderboardsUpdatedDay: state.leaderboardsUpdatedDay,
        campaigns: state.campaigns,
        triplecrownHistory: state.triplecrownHistory,
      }),
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
