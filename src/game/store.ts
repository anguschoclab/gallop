import { create } from "zustand";
import { shallow } from "zustand/shallow";
import { persist } from "zustand/middleware";
import type {
  Horse,
  Race,
  Pregnancy,
  ScoutReport,
  AuctionSale,
  GameState,
  HorseCampaign,
  CampaignGoalType,
  ConfirmedAptitudes,
} from "./types";
import { GRADED_RACES } from "./gradedRaces";
import {
  generateHorse,
  horsePrice,
  generateRace,
  makeGradedRace,
  horsePriceWithPedigree,
} from "./horseGen";
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
import { createDefaultCoreState, createDefaultMarketState, createDefaultBreedingState, createDefaultRacingState, createDefaultSystemsState, type NewGameOptions } from "./state";
import { runRaceToCompletion, type Runner } from "./raceSim";
import { generateAuctionLots, resolveAuctionSale } from "./auction";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { isUniversalBirthday, isBreedingSeasonStart } from "@/core/calendar/breedingCalendar";
import {
  detectInbreedingPattern,
  inbreedingPerformanceDampener,
} from "@/core/breeding/populationGenetics";
import { recalcStandingFee, calculateRecommendedStudFee } from "@/core/breeding/stallions";
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
import { stallionRetirementPhase } from "@/core/time/phases/stallionRetirement";
import { pastureRetirementPhase } from "@/core/time/phases/pastureRetirement";
import { hallOfFamePhase } from "@/core/time/phases/hallOfFame";
import { horseDeathPhase } from "@/core/time/phases/horseDeath";
import { resolveLiveRaceWithImpacts } from "./liveRaceResolution";
import type { AnyImpact } from "@/core/resolver/impacts";
import { intentCollectionPhase } from "@/core/time/phases/intentCollection";
import { intentValidationPhase } from "@/core/time/phases/intentValidation";
import { raceEntryResolutionPhase } from "@/core/time/phases/raceEntryResolution";
import { purchaseResolutionPhase } from "@/core/time/phases/purchaseResolution";
import { breedingResolutionPhase } from "@/core/time/phases/breedingResolution";
import { trainingResolutionPhase } from "@/core/time/phases/trainingResolution";
import { raceResolutionPhase } from "@/core/time/phases/raceResolution";
import { claimingWithdrawalPhase } from "@/core/time/phases/claimingWithdrawal";
import { impactApplicationPhase } from "@/core/time/phases/impactApplication";
import { computePlayerRaceDays, advanceMultipleDaysWithRaceDetection } from "@/core/time/advance";
import { calculateClassBonus } from "@/core/common/classBonus";
import { applyImpacts, type ResolverContext } from "@/core/resolver/resolver";
import { DEFAULT_PLAYER_RESERVE_RATIO } from "./auction";
import type {
  RenameIntent,
  AnyIntent,
  TrainingIntent,
  RaceEntryIntent,
  BreedingIntent,
  PurchaseIntent,
} from "@/core/resolver/intents";
import type {
  UserSettings,
  DisplaySettings,
  GameplaySettings,
  NotificationSettings,
  AudioSettings,
} from "@/core/settings/settingsTypes";
import { createDefaultUserSettings } from "@/core/settings/settingsTypes";
import type {
  RenameImpact,
  EnergyImpact,
  FormImpact,
  FameImpact,
  RaceHistoryImpact,
  CashImpact,
  BlueHenImpact,
  StudCareerImpact,
  PaceSampleImpact,
  JockeyStatsImpact,
  LogImpact,
} from "@/core/resolver/impacts";
import type { RegionalAward, AwardRegion } from "@/game/awards/types";
import type { Leaderboard, SireTrendData } from "@/core/breeding/leaderboardTypes";
import type { Expense } from "@/core/expenses";
import {
  upgradeFacility,
  createDefaultPlayerFacilities,
  createFacility,
} from "@/core/facilities";
import type { PlayerProfile } from "./types";
import type { Backstory } from "@/core/newGame/backstories";
import { getReputationTier } from "@/core/reputation";
import {
  PRIZE_SPLIT,
  UPKEEP_PER_HORSE,
  TRAINING_COST,
  STARTING_CASH,
  BREEDING_FEE,
  LIVE_FOAL_GUARANTEE_FEE,
  GESTATION_DAYS,
  SEASON_DAYS,
  MAX_SAMPLES_PER_BUCKET,
} from "./constants/gameConstants";
import {
  computePayoutSplits,
  sanitizeAndRankResults,
  detectPhotoFinish,
} from "./store/helpers/raceResolution";
import {
  ageHorses,
  refreshMarket,
  generateUpcomingRaces,
  pruneOldRaces,
} from "./store/helpers/market";
import { resolvePregnancies } from "./store/helpers/pregnancy";
import { maybeRecalibratePars, recomputePars, type RecalibrationResult } from "./store/helpers/beyer";
import { createOpfsStorage, createRehydrateStore, hydrationComplete } from "./store/storage";
import { createInitialState } from "./store/initialization";

// Re-export helper functions for external consumers
export { maybeRecalibratePars, recomputePars, type RecalibrationResult } from "./store/helpers/beyer";
export { computePayoutSplits, sanitizeAndRankResults, detectPhotoFinish } from "./store/helpers/raceResolution";
export { ageHorses, refreshMarket, generateUpcomingRaces, pruneOldRaces } from "./store/helpers/market";
export { resolvePregnancies, type PregnancyResult } from "./store/helpers/pregnancy";
export { hydrationComplete } from "./store/storage";

export type ActionResult = { ok: true } | { ok: false; reason: string };

const TRAINING_SLOTS_PER_DAY = 2;

// =============================================================================
// Race Resolution Helpers (now imported from helpers/raceResolution.ts)
// =============================================================================

// =============================================================================
// Day Advancement Helpers (now imported from helpers/market.ts)
// =============================================================================

// =============================================================================
// Pregnancy Resolution Helpers (now imported from helpers/pregnancy.ts)
// =============================================================================

// =============================================================================
// Beyer Recalibration Helpers (now imported from helpers/beyer.ts)
// =============================================================================

type Actions = {
  startNewGame: (options: NewGameOptions) => Promise<void>;
  trainHorse: (
    horseId: string,
    kind:
      | "speed"
      | "stamina"
      | "acceleration"
      | "rest"
      | "bullet"
      | "breeze"
      | "gate_work"
      | "swimming"
      | "gallop",
  ) => void;
  buyHorse: (horseId: string) => void;
  enterRace: (raceId: string, horseId: string) => ActionResult;
  withdrawRace: (raceId: string, horseId: string) => void;
  resolveRaceWithImpacts: (
    raceId: string,
    result: { horseId: string; position: number; time: number }[],
    runners?: import("./raceSim").Runner[],
  ) => void;
  submitClaim: (raceId: string, horseId: string) => ActionResult;
  withdrawClaim: (raceId: string, horseId: string) => ActionResult;
  breed: (sireId: string, damId: string, liveFoalGuarantee?: boolean) => ActionResult;
  retireToPasture: (horseId: string) => ActionResult;
  hireJockey: (jockeyId: string) => ActionResult;
  rerollJockeySilk: (jockeyId: string) => ActionResult;
  assignJockey: (raceId: string, horseId: string, jockeyId: string) => ActionResult;
  advanceDay: () => void;
  advanceMultipleDays: (n: number, headless?: boolean) => void;
  advanceWeek: (headless?: boolean) => void;
  advanceMonth: (headless?: boolean) => void;
  advanceYear: (headless?: boolean) => void;
  scoutHorse: (horseId: string) => {
    success: boolean;
    report?: ScoutReport;
    cost: number;
    message: string;
  };
  consignHorse: (horseId: string, saleId: string, reservePrice?: number) => ActionResult;
  withdrawConsignment: (horseId: string) => ActionResult;
  placeBookBid: (saleId: string, lotId: string, amount: number) => ActionResult;
  /** Atomic player-cash debit for a live Theater bid. */
  debitForLiveBid: (amount: number) => ActionResult;
  /** Commit a live-Theater auction's results. Applies impacts via the resolver. */
  commitAuctionResult: (
    saleId: string,
    finalLots: import("./types").AuctionLot[],
    impacts: import("@/core/resolver/impacts").AnyImpact[],
  ) => ActionResult;
  clearPendingCeremonies: () => void;
  geldingHorse: (horseId: string) => ActionResult;
  renameHorse: (horseId: string, newName: string) => ActionResult;
  enqueueIntent: (intent: AnyIntent) => void;
  setCampaign: (campaign: HorseCampaign) => void;
  updateCampaignSlot: (
    horseId: string,
    slotIndex: number,
    patch: Partial<HorseCampaign["slots"][number]>,
  ) => void;
  dismissCampaignFlag: (horseId: string, flagIndex: number) => void;
  deleteCampaign: (horseId: string) => void;
  generateAutoCampaign: (
    horseId: string,
    goalType: CampaignGoalType,
    targetRaceKey?: string,
  ) => void;
  updateUserSettings: (settings: Partial<UserSettings>) => void;
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
  updateGameplaySettings: (settings: Partial<GameplaySettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  resetSettings: () => void;
  upgradeFacility: (facilityType: string) => ActionResult;
  updateStudFee: (horseId: string, newFee: number) => ActionResult;
  retireToStud: (horseId: string) => ActionResult;
};

// Create storage adapter using factory function
const opfsStorage = createOpfsStorage();

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
      awards: [],
      campaigns: [],
      expenses: [],
      transactions: [],
      replays: [],

      startNewGame: async (options: NewGameOptions) => {
        // Clear OPFS storage when starting a new game
        await (await import("@/services/storageAdapter")).clearGameState();
        set({ ...createInitialState(options) });
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
              {
                day: s.day,
                text: `Training blocked: ${horse.name} is ${horse.healthStatus === "covering_sickness" ? "sick with covering sickness (dourine)" : "recovering from illness"}. Horse cannot be trained while recovering.`,
              },
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
            log: [
              { day: s.day, text: `${horse.name} scheduled for ${kind} training.` },
              ...s.log,
            ].slice(0, 50),
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
          log: [
            { day: s.day, text: `${h.name} purchase scheduled for $${price.toLocaleString()}.` },
            ...s.log,
          ].slice(0, 50),
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
        if (s.pregnancies.some((p) => !p.resolved && p.damId === horseId))
          return fail(`${horse.name} is pregnant.`);
        if (race.entries.some((e) => e.horseId === horseId))
          return fail(`${horse.name} is already entered.`);
        if (race.entries.length >= race.fieldSize) return fail("Race field is full.");
        if (!horse.racingViable)
          return fail(`${horse.name} is not racing viable due to genetic condition.`);
        if (horse.lifecycleStatus === "retired")
          return fail(`${horse.name} is retired and cannot race.`);
        if (horse.lifecycleStatus === "deceased")
          return fail(`${horse.name} is deceased and cannot race.`);
        // Economic guard: refuse races whose entry fee exceeds 50% of purse —
        // this catches misconfigured races and protects the player's bankroll.
        if (race.entryFee > race.purse * 0.5) return fail("Entry fee exceeds 50% of purse.");

        // Check if horse has entry fee waiver for this race
        let effectiveEntryFee = race.entryFee;
        if (race.graded?.key && horse.winAndYouInQualified) {
          const currentYear = getCurrentYear(s.day);
          const hasWaiver = horse.winAndYouInQualified.some(
            (q) => q.raceKey === race.graded!.key && q.year === currentYear,
          );
          if (hasWaiver) {
            effectiveEntryFee = 0;
          }
        }

        if (s.cash < effectiveEntryFee) return fail("Insufficient cash for entry fee.");
        const r = race.restrictions;
        if (r) {
          const minAgeToCheck =
            horse.hemisphere === "Northern"
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
          log: [
            { day: s.day, text: `${horse.name} scheduled to enter ${race.name}.` },
            ...s.log,
          ].slice(0, 50),
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

      resolveRaceWithImpacts: (
        raceId: string,
        result: { horseId: string; position: number; time: number }[],
        runners: Runner[] = [],
      ) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race || race.resolved) return;

        const newState = resolveLiveRaceWithImpacts(
          race,
          result,
          runners,
          s.horses,
          s.jockeys ?? [],
          s.npcStables,
          s.day,
        );
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
          return {
            ok: false,
            reason: `Insufficient funds (need $${race.claimingPrice.toLocaleString()})`,
          };
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

      withdrawClaim: (raceId, horseId) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        const horse = s.horses.find((h) => h.id === horseId);

        if (!race) return { ok: false, reason: "Race not found" };
        if (!horse) return { ok: false, reason: "Horse not found" };
        if (race.resolved) return { ok: false, reason: "Race already resolved" };
        if (!race.claimingPrice) return { ok: false, reason: "Race is not a claiming race" };
        if (race.raceClass !== "OptionalClaiming" && race.raceClass !== "MaidenOptionalClaiming") {
          return { ok: false, reason: "Withdrawal only allowed in optional claiming races" };
        }
        if (horse.stableId !== undefined) {
          return { ok: false, reason: "Cannot withdraw NPC-owned horse" };
        }

        const entry = race.entries.find((e) => e.horseId === horseId);
        if (!entry) return { ok: false, reason: "Horse not entered in this race" };
        if (entry.withdrawnFromClaiming) {
          return { ok: false, reason: "Horse already withdrawn from claiming" };
        }

        // Enqueue WithdrawFromClaimingIntent
        s.enqueueIntent({
          id: generateUUID(),
          entityId: horseId,
          source: "player",
          day: s.day,
          priority: 100,
          type: "withdraw_from_claiming",
          raceId,
          horseId,
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

        const totalFee = isExternal
          ? BREEDING_FEE + (liveFoalGuarantee ? (LIVE_FOAL_GUARANTEE_FEE as number) : 0) + studFee
          : 0;
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
            {
              day: s.day,
              text: `${sire!.name} × ${dam!.name} breeding scheduled. Fee $${totalFee.toLocaleString()}${studFee ? ` (incl. $${studFee.toLocaleString()} stud fee)` : ""}${liveFoalGuarantee ? " (Live Foal Guarantee)" : ""}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      retireToPasture: (horseId) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        const fail = (reason: string): ActionResult => {
          set({ log: [{ day: s.day, text: `Retire to pasture: ${reason}` }, ...s.log].slice(0, 50) });
          return { ok: false, reason };
        };
        if (!horse) return fail("Horse not found.");
        if (!horse.owned) return fail("You don't own this horse.");
        if (horse.lifecycleStatus !== "active") return fail("Horse is already retired or deceased.");
        // Block retirement if entered in any unresolved race
        const enteredRaces = s.races.filter(
          (r) => !r.resolved && r.entries.some((e) => e.horseId === horseId),
        );
        if (enteredRaces.length > 0) return fail("Withdraw from upcoming races before retiring.");

        const updatedHorses = s.horses.map((h) =>
          h.id === horseId
            ? { ...h, lifecycleStatus: "retired" as const, retiredOnDay: s.day }
            : h,
        );
        set({
          horses: updatedHorses,
          log: [
            {
              day: s.day,
              text: `${horse.name} has been retired to pasture.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      hireJockey: (jockeyId) => {
        const s = get();
        const jockey = s.jockeys?.find((j) => j.id === jockeyId);
        if (!jockey) return { ok: false, reason: "Jockey not found." };
        if (jockey.stableId) return { ok: false, reason: "Jockey is already under contract." };

        const signOnBonus = jockey.ridingFee * 30; // 30 races worth for player retainer
        if (s.cash < signOnBonus)
          return {
            ok: false,
            reason: `Insufficient cash. Sign-on bonus is $${signOnBonus.toLocaleString()}.`,
          };

        set({
          cash: s.cash - signOnBonus,
          jockeys: s.jockeys?.map((j) =>
            j.id === jockeyId ? { ...j, contractUntil: s.day + 90 } : j,
          ), // stableId undefined means player
          log: [
            {
              day: s.day,
              text: `Signed ${jockey.name} to a 90-day retainer for $${signOnBonus.toLocaleString()}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      rerollJockeySilk: (jockeyId) => {
        const s = get();
        const jockey = s.jockeys?.find((j) => j.id === jockeyId);
        if (!jockey) return { ok: false, reason: "Jockey not found." };

        // Only allow rerolling retained jockeys (player's jockeys)
        if (!jockey.contractUntil)
          return { ok: false, reason: "You can only reroll silks for your retained jockeys." };

        const rng = createRng(hashStr(`reroll_silk_${jockeyId}_${s.day}`));
        const newSilk = generateSilk(rng);

        set({
          jockeys: s.jockeys?.map((j) => (j.id === jockeyId ? { ...j, silk: newSilk } : j)),
          log: [
            { day: s.day, text: `${jockey.name}'s racing silks have been updated.` },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      assignJockey: (raceId, horseId, jockeyId) => {
        const s = get();
        const race = s.races.find((r) => r.id === raceId);
        if (!race) return { ok: false, reason: "Race not found." };
        const entry = race.entries.find((e) => e.horseId === horseId);
        if (!entry) return { ok: false, reason: "Horse not entered in this race." };

        const jockey = (s.jockeys ?? []).find((j) => j.id === jockeyId);
        if (!jockey) return { ok: false, reason: "Jockey not found." };

        // Check if jockey already has a mount in this race
        if (race.entries.some((e) => e.jockeyId === jockeyId && e.horseId !== horseId)) {
          return {
            ok: false,
            reason: `${jockey.name} is already riding another horse in this race.`,
          };
        }

        // Deduct riding fee
        if (s.cash < jockey.ridingFee)
          return { ok: false, reason: "Insufficient cash for riding fee." };

        const updatedRaces = s.races.map((r) =>
          r.id === raceId
            ? {
                ...r,
                entries: r.entries.map((e) => (e.horseId === horseId ? { ...e, jockeyId } : e)),
              }
            : r,
        );

        set({
          races: updatedRaces,
          cash: s.cash - jockey.ridingFee,
          log: [
            {
              day: s.day,
              text: `Assigned ${jockey.name} to horse for $${jockey.ridingFee.toLocaleString()}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      scoutHorse: (horseId) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) {
          return { success: false, cost: 0, message: "Horse not found." };
        }
        if (!horse.stableId) {
          return { success: false, cost: 0, message: "Cannot scout your own horses." };
        }
        const stable = s.npcStables.find((st) => st.id === horse.stableId);
        if (!stable) {
          return { success: false, cost: 0, message: "Stable not found." };
        }

        const scoutRng = createRng(hashStr(`scout_${horseId}_${s.day}`));
        const result = performScout(horse, stable, s.day, s.cash, scoutRng);

        if (result.success && result.report) {
          const report = result.report;
          // Deduct cost and save report
          const updatedHorses = s.horses.map((h) =>
            h.id === horseId
              ? { ...h, scoutedStats: report.revealedStats, lastScoutedDay: s.day }
              : h,
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
          s.horses.forEach((h) => {
            if (h.winAndYouInQualified) {
              h.winAndYouInQualified = h.winAndYouInQualified.filter((q) => q.year >= currentYear);
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
          stallionRetirementPhase,
          pastureRetirementPhase,
          hallOfFamePhase,
          horseDeathPhase,
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
          claimingWithdrawalPhase,
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
          log: [
            ...newLogs,
            { day: newDay, text: `Day ${newDay} begins. Upkeep: $${playerUpkeep}.` },
            ...s.log,
          ].slice(0, 50),
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
              (r) => !r.resolved && r.day === nextDay && r.entries.some((e) => e.owned),
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

      consignHorse: (horseId: string, saleId: string, reservePrice?: number) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
        if (horse.consignedSaleId) return { ok: false, reason: "Already consigned to a sale." };
        const sale = (s.auctions ?? []).find((a) => a.id === saleId);
        if (!sale) return { ok: false, reason: "Sale not found." };
        if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
        const baseValue = horsePriceWithPedigree(horse, s.horses);
        const finalReserve = Math.round(reservePrice ?? baseValue * DEFAULT_PLAYER_RESERVE_RATIO);
        set({
          horses: s.horses.map((h) => (h.id === horseId ? { ...h, consignedSaleId: saleId } : h)),
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
                      reservePrice: finalReserve,
                      passed: false,
                      withdrawn: false,
                    },
                  ],
                }
              : a,
          ),
          log: [
            {
              day: s.day,
              text: `${horse.name} consigned to ${sale.name} (reserve $${finalReserve.toLocaleString()}).`,
            },
            ...s.log,
          ].slice(0, 50),
        });
        return { ok: true };
      },

      withdrawConsignment: (horseId: string) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.consignedSaleId) return { ok: false, reason: "Horse is not consigned." };
        const sale = (s.auctions ?? []).find((a) => a.id === horse.consignedSaleId);
        if (sale && sale.day - s.day < 3)
          return { ok: false, reason: "Cannot withdraw within 3 days of the sale." };
        set({
          horses: s.horses.map((h) =>
            h.id === horseId ? { ...h, consignedSaleId: undefined } : h,
          ),
          auctions: (s.auctions ?? []).map((a) =>
            a.id === horse.consignedSaleId
              ? {
                  ...a,
                  lots: a.lots.map((l) => (l.horseId === horseId ? { ...l, withdrawn: true } : l)),
                }
              : a,
          ),
        });
        return { ok: true };
      },

      placeBookBid: (saleId: string, lotId: string, amount: number) => {
        const s = get();
        const sale = (s.auctions ?? []).find((a) => a.id === saleId);
        if (!sale) return { ok: false, reason: "Sale not found." };
        if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
        const lot = sale.lots.find((l) => l.id === lotId);
        if (!lot) return { ok: false, reason: "Lot not found." };
        if (lot.passed || lot.withdrawn)
          return { ok: false, reason: "Lot is no longer available." };
        if (amount <= (lot.hammerPrice ?? 0))
          return { ok: false, reason: "Bid must exceed current price." };
        if (s.cash < amount) return { ok: false, reason: "Insufficient funds." };
        // Book bids are simple: the player becomes current high bidder. NPC
        // overbids displace them at offline resolution. Cash is debited only
        // at sale resolution (or refunded if outbid). The runner picks up
        // hammerPrice as the lot's starting bid.
        set({
          auctions: (s.auctions ?? []).map((a) =>
            a.id === saleId
              ? {
                  ...a,
                  lots: a.lots.map((l) =>
                    l.id === lotId ? { ...l, hammerPrice: amount, soldToStableId: undefined } : l,
                  ),
                }
              : a,
          ),
        });
        return { ok: true };
      },

      debitForLiveBid: (amount: number) => {
        const s = get();
        if (amount <= 0) return { ok: false, reason: "Invalid bid amount." };
        if (s.cash < amount) return { ok: false, reason: "Insufficient funds." };
        set({ cash: s.cash - amount });
        return { ok: true };
      },

      commitAuctionResult: (saleId, finalLots, impacts) => {
        const s = get();
        const sale = (s.auctions ?? []).find((a) => a.id === saleId);
        if (!sale) return { ok: false, reason: "Sale not found." };
        if (sale.resolved) return { ok: false, reason: "Sale already resolved." };
        // Apply impacts via the resolver to commit cash transfers, horse
        // ownership changes, and lot updates atomically.
        const applied = applyImpacts({
          state: {
            ...s,
            auctions: (s.auctions ?? []).map((a) =>
              a.id === saleId ? { ...a, lots: finalLots, resolved: true } : a,
            ),
          } as GameState,
          intents: [],
          impacts,
          impactLog: [],
          day: s.day,
        });
        // Build a log line summarizing the player's outcomes.
        const playerWon = finalLots.filter(
          (l) =>
            l.consignorStableId && !l.passed && l.soldToStableId === undefined && l.hammerPrice,
        ).length;
        const playerSold = finalLots.filter(
          (l) => !l.consignorStableId && !l.passed && l.hammerPrice,
        ).length;
        const summary = `${sale.name} concluded — ${playerWon ? `acquired ${playerWon}` : "no acquisitions"}; ${playerSold ? `sold ${playerSold}` : "no consignments sold"}.`;
        set({
          ...applied.state,
          log: [{ day: s.day, text: summary }, ...s.log].slice(0, 50),
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
        const horse = s.horses.find((h) => h.id === horseId);
        const cost = 500;

        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
        if (horse.gender === "gelding" || horse.gender === "filly" || horse.gender === "mare") {
          return { ok: false, reason: "Only colts and stallions can be gelded." };
        }
        if (s.cash < cost) return { ok: false, reason: `Insufficient funds ($${cost} required).` };

        // Block if entered in a race
        const isEntered = s.races.some(
          (r) => !r.resolved && r.entries.some((e) => e.horseId === horseId),
        );
        if (isEntered) return { ok: false, reason: "Withdraw from races before gelding." };

        const updatedHorses = s.horses.map((h) => {
          if (h.id === horseId) {
            return {
              ...h,
              gender: "gelding" as const,
              energy: Math.max(0, h.energy - 50), // Significant recovery needed
              stats: {
                ...h.stats,
                consistency: Math.min(100, h.stats.consistency + 5), // Permanent consistency boost
              },
            };
          }
          return h;
        });

        set({
          horses: updatedHorses,
          cash: s.cash - cost,
          log: [
            {
              day: s.day,
              text: `${horse.name} has been gelded. Recovery will take some time, but they should be more consistent now.`,
            },
            ...s.log,
          ].slice(0, 50),
        });

        return { ok: true };
      },

      renameHorse: (horseId: string, newName: string) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);

        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
        if (!newName || newName.trim().length === 0)
          return { ok: false, reason: "Name cannot be empty." };
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
          log: [
            { day: s.day, text: `${horse.name} has been renamed to ${newName.trim()}.` },
            ...s.log,
          ].slice(0, 50),
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
        const existing = (s.campaigns ?? []).findIndex((c) => c.horseId === campaign.horseId);
        const updated =
          existing >= 0
            ? (s.campaigns ?? []).map((c, i) => (i === existing ? campaign : c))
            : [...(s.campaigns ?? []), campaign];
        set({ campaigns: updated });
      },

      updateCampaignSlot: (
        horseId: string,
        slotIndex: number,
        patch: Partial<HorseCampaign["slots"][number]>,
      ) => {
        const s = get();
        set({
          campaigns: (s.campaigns ?? []).map((c) =>
            c.horseId !== horseId
              ? c
              : {
                  ...c,
                  slots: c.slots.map((sl, i) => (i === slotIndex ? { ...sl, ...patch } : sl)),
                },
          ),
        });
      },

      dismissCampaignFlag: (horseId: string, flagIndex: number) => {
        const s = get();
        set({
          campaigns: (s.campaigns ?? []).map((c) =>
            c.horseId !== horseId
              ? c
              : {
                  ...c,
                  flags: c.flags.map((f, i) => (i === flagIndex ? { ...f, dismissed: true } : f)),
                },
          ),
        });
      },

      deleteCampaign: (horseId: string) => {
        const s = get();
        set({ campaigns: (s.campaigns ?? []).filter((c) => c.horseId !== horseId) });
      },

      generateAutoCampaign: (
        horseId: string,
        goalType: CampaignGoalType,
        targetRaceKey?: string,
      ) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
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
        const existing = (s.campaigns ?? []).findIndex((c) => c.horseId === horseId);
        const updated =
          existing >= 0
            ? (s.campaigns ?? []).map((c, i) => (i === existing ? campaign : c))
            : [...(s.campaigns ?? []), campaign];
        set({ campaigns: updated });
      },

      // Settings actions
      updateUserSettings: (settings: Partial<UserSettings>) => {
        const s = get();
        const currentSettings = s.userSettings ?? createDefaultUserSettings(s.day);
        set({
          userSettings: {
            ...currentSettings,
            ...settings,
            lastModified: s.day,
          },
        });
      },

      updateDisplaySettings: (settings: Partial<DisplaySettings>) => {
        const s = get();
        const currentSettings = s.userSettings ?? createDefaultUserSettings(s.day);
        set({
          userSettings: {
            ...currentSettings,
            display: { ...currentSettings.display, ...settings },
            lastModified: s.day,
          },
        });
      },

      updateGameplaySettings: (settings: Partial<GameplaySettings>) => {
        const s = get();
        const currentSettings = s.userSettings ?? createDefaultUserSettings(s.day);
        set({
          userSettings: {
            ...currentSettings,
            gameplay: { ...currentSettings.gameplay, ...settings },
            lastModified: s.day,
          },
        });
      },

      updateNotificationSettings: (settings: Partial<NotificationSettings>) => {
        const s = get();
        const currentSettings = s.userSettings ?? createDefaultUserSettings(s.day);
        set({
          userSettings: {
            ...currentSettings,
            notifications: { ...currentSettings.notifications, ...settings },
            lastModified: s.day,
          },
        });
      },

      updateAudioSettings: (settings: Partial<AudioSettings>) => {
        const s = get();
        const currentSettings = s.userSettings ?? createDefaultUserSettings(s.day);
        set({
          userSettings: {
            ...currentSettings,
            audio: { ...currentSettings.audio, ...settings },
            lastModified: s.day,
          },
        });
      },

      resetSettings: () => {
        set({
          userSettings: createDefaultUserSettings(get().day),
        });
      },

      upgradeFacility: (facilityType: string) => {
        const s = get();
        const facility = s.facilities?.[facilityType as keyof typeof s.facilities];
        if (!facility) return { ok: false, reason: "Facility not found" };
        const result = upgradeFacility(facility, s.day);
        if (!result) return { ok: false, reason: "Already at max level" };
        set({
          facilities: {
            ...s.facilities,
            [facilityType]: result,
          } as any,
        });
        return { ok: true };
      },

      updateStudFee: (horseId: string, newFee: number) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
        if (!horse.stud?.atStud) return { ok: false, reason: "Horse is not at stud." };

        if (newFee < 500) return { ok: false, reason: "Minimum fee is $500." };
        if (newFee > 1000000) return { ok: false, reason: "Maximum fee is $1,000,000." };

        set({
          horses: s.horses.map((h) =>
            h.id === horseId
              ? {
                  ...h,
                  stud: {
                    ...h.stud!,
                    standingFee: Math.round(newFee / 500) * 500,
                  },
                }
              : h,
          ),
          log: [
            {
              day: s.day,
              text: `${horse.name}'s standing fee updated to $${newFee.toLocaleString()}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });

        return { ok: true };
      },

      retireToStud: (horseId) => {
        const s = get();
        const horse = s.horses.find((h) => h.id === horseId);
        if (!horse) return { ok: false, reason: "Horse not found." };
        if (!horse.owned) return { ok: false, reason: "You don't own this horse." };
        if (horse.gender === "mare" || horse.gender === "filly" || horse.gender === "gelding") {
          return { ok: false, reason: "Only stallions and colts can be retired to stud." };
        }
        if (horse.stud?.atStud) return { ok: false, reason: "Horse is already at stud." };
        if (horse.age < 3) return { ok: false, reason: "Horse must be at least 3 years old." };

        // Check if entered in races
        const isEntered = s.races.some(
          (r) => !r.resolved && r.entries.some((e) => e.horseId === horseId),
        );
        if (isEntered) return { ok: false, reason: "Withdraw from races before retiring." };

        const initialFee = calculateRecommendedStudFee(horse, {
          horses: s.horses,
          npcStables: s.npcStables,
        });

        set({
          horses: s.horses.map((h) =>
            h.id === horseId
              ? {
                  ...h,
                  gender: "horse",
                  stud: {
                    atStud: true,
                    standingFee: initialFee,
                    bookSize: 40,
                    seasonBookings: 0,
                    lifetimeFoals: 0,
                    lifetimeStakesFoals: 0,
                    lifetimeG1Foals: 0,
                    retiredOnDay: s.day,
                  },
                }
              : h,
          ),
          log: [
            {
              day: s.day,
              text: `${horse.name} retired to stud with an initial fee of $${initialFee.toLocaleString()}.`,
            },
            ...s.log,
          ].slice(0, 50),
        });

        return { ok: true };
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
        playerProfile: state.playerProfile,
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
        facilities: state.facilities,
        npcFacilities: state.npcFacilities,
        userSettings: state.userSettings,
        expenses: state.expenses,
        transactions: state.transactions,
        replays: state.replays,
        reputation: state.reputation,
        transports: state.transports,
      }),
      onRehydrateStorage: () => (state) => {
        hydrationComplete.value = true;
        if (state?.calibratedPars) setCalibratedPars(state.calibratedPars);
      },
    },
  ),
);

// Function to manually rehydrate the store (call on client mount)
export const rehydrateStore = createRehydrateStore(createInitialState);

// Export shallow for use in components that need to compare object/array selectors
export { shallow };

// Custom hook that supports shallow comparison for object/array selectors
// Use this when selecting multiple state values to prevent unnecessary re-renders
// Example: const { horses, awards } = useGameWithShallow((s) => ({ horses: s.horses, awards: s.awards }));
export const useGameWithShallow = <T>(selector: (state: GameState & Actions) => T): T =>
  (useGame as any)(selector, shallow);
