/**
 * agentObservation.ts - Hidden-information boundary for NPC agents
 *
 * NPC decision-making must not read hidden world state. This module builds
 * `NpcObservation` — a branded `GameState` clone in which every field is
 * classified and enforced as one of:
 *
 * - public: world facts any participant can observe (races, entries, results,
 *   news, market listings, leaderboards, registries, weather).
 * - own-private: the acting stable's own internals (its AI state, facilities,
 *   horses' full records, cash, breeding programs).
 * - redacted player-private: the player's ledger, inbox, scouting intel,
 *   strategy/campaign plans, settings, solvency internals and queued intents.
 *   Replaced with empty defaults or deterministic public estimates.
 * - redacted rival-private: other stables' cash and AI internals, and other
 *   horses' hidden condition/genetic-expression fields. Replaced with
 *   deterministic public estimates derived from observable signals.
 * - engine-internal: execution/revision fields stripped entirely.
 *
 * Determinism: every estimate is a pure function of public fields and entity
 * ids — no RNG — so same-seed runs stay checksum-identical.
 *
 * Dependencies: @/game/types, @/core/market/strategy (DEFAULT_MARKET_STRATEGY)
 * Related files: npcActionRegistry.ts (consumes observations), npc/intentGenerators.ts (builds them)
 */

import type { GameState, Horse, Stable } from "@/game/types";
import { DEFAULT_MARKET_STRATEGY } from "@/core/market/strategy";

const NPC_OBSERVATION_BRAND: unique symbol = Symbol.for("gallop.npcObservation");

/**
 * A `GameState` sanitized for one NPC stable's decision-making.
 *
 * The brand makes raw `GameState` non-assignable to `NpcObservation`, so
 * `NpcActionContext.state` can only be populated through
 * `buildNpcObservation`. The observation is still assignable *to*
 * `GameState`, so existing generator signatures keep working while the
 * hidden fields they must not see are gone at runtime.
 */
export type NpcObservation = GameState & {
  readonly [NPC_OBSERVATION_BRAND]: "npc-observation";
};

/** Sentinel acting-stable id for a stable-agnostic public world view. */
export const PUBLIC_WORLD_OBSERVER = "__world__";

/** Fame at or above which a horse's realized stats are public knowledge. */
const FAME_STATS_PUBLIC = 70;

/**
 * Deterministic jitter in roughly ±range derived from an entity id.
 * @param id
 * @param range
 */
function idJitter(id: string, range: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return (((hash >>> 0) % 1000) / 1000 - 0.5) * 2 * range;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Public estimate of a rival stable's bankroll.
 *
 * Rivals see reputation, tier and results — not the ledger. The estimate is
 * a deterministic function of those public signals.
 * @param stable
 */
export function estimateStableCash(stable: Stable): number {
  const tierBase = { elite: 400_000, mid: 180_000, budget: 60_000 }[stable.tier] ?? 100_000;
  return Math.round(tierBase + stable.reputation * 3_000 + idJitter(stable.id, tierBase * 0.1));
}

/**
 * Public estimate of the player's bankroll, derived from the public
 * reputation score and the career earnings of player-owned horses.
 * @param state
 * @param horses - Optional pre-indexed horse collection (avoids re-reading state.horses)
 */
export function estimatePublicPlayerCash(state: GameState, horses?: Iterable<Horse>): number {
  const reputationScore = state.reputation?.score ?? 100;
  const playerEarnings = (horses ? Array.from(horses) : Object.values(state.horses))
    .filter((h) => h.ownership?.type === "player")
    .reduce((sum, h) => sum + (h.lifetimeEarnings ?? 0), 0);
  return Math.round(25_000 + reputationScore * 2_000 + playerEarnings * 0.5);
}

/**
 * Public estimate of a horse's potential from observable form.
 *
 * Potential is the game's core hidden rating; rivals approximate it from
 * results, age and last Beyer — never the stored value.
 * @param horse
 */
export function estimatePublicPotential(horse: Horse): number {
  const winRate = horse.careerStarts > 0 ? horse.careerWins / horse.careerStarts : 0;
  const beyer = horse.lastBeyer ?? 50;
  const ageCurve = horse.age <= 3 ? 10 : -Math.max(0, horse.age - 6) * 3;
  return clamp(Math.round(40 + winRate * 40 + beyer * 0.3 + ageCurve), 1, 100);
}

/**
 * Public estimate of a horse's training-load state.
 *
 * Fitness/fatigue are training internals; observers infer condition from
 * public form and days since the last start.
 * @param horse
 * @param day
 */
function estimateCondition(
  horse: Horse,
  day: number,
): {
  fitness: number;
  fatigue: number;
  peakingIndex: number;
  energy: number;
  recoveryPoints: number;
} {
  const daysSinceRace = horse.lastRaceDay != null ? Math.max(0, day - horse.lastRaceDay) : 30;
  const fitness = clamp(50 + horse.form * 5, 10, 95);
  const fatigue = clamp(50 - daysSinceRace * 10, 5, 60);
  return {
    fitness,
    fatigue,
    peakingIndex: fitness - fatigue,
    energy: clamp(60 + daysSinceRace * 8, 30, 100),
    recoveryPoints: clamp(50 + daysSinceRace * 10 + horse.form * 3, 0, 100),
  };
}

/**
 * Fame-gated public view of realized stats.
 *
 * Famous horses' ability is public knowledge; lesser-known horses get the
 * same deterministic ±3 fuzz the scouting UI applies to auto-visible stats
 * (`getDisplayableStats` in ./npc/scouting.ts).
 * @param horse
 */
function publicStats(horse: Horse): Horse["stats"] {
  if (horse.fame >= FAME_STATS_PUBLIC) return horse.stats;
  const fuzz = ((horse.id.charCodeAt(0) + horse.id.length) % 7) - 3;
  const fuzzed = { ...horse.stats };
  for (const key of Object.keys(fuzzed) as (keyof Horse["stats"])[]) {
    const value = fuzzed[key];
    if (typeof value === "number") {
      fuzzed[key] = clamp(value + fuzz, 1, 100);
    }
  }
  return fuzzed;
}

/**
 * Public view of a horse the acting stable does not own.
 *
 * Keeps everything knowable from form, results and the public stud book
 * (identity, pedigree, genotype, aptitudes, career record, earnings, fame).
 * Replaces hidden internals — realized potential, Banister training load,
 * freshness, fertility — with deterministic estimates, and drops lab-level
 * genetic internals entirely.
 * @param horse
 * @param day
 */
export function publicHorseView(horse: Horse, day: number): Horse {
  const condition = estimateCondition(horse, day);
  return {
    ...horse,
    stats: publicStats(horse),
    potential: estimatePublicPotential(horse),
    fitness: condition.fitness,
    fatigue: condition.fatigue,
    peakingIndex: condition.peakingIndex,
    energy: condition.energy,
    recoveryPoints: condition.recoveryPoints,
    fertility: undefined,
    foalingEase: 0.5,
    heterozygosity: 0.5,
    coefficientOfInbreeding: undefined,
    ancestralHistoryCoefficient: undefined,
    geneticMarkers: undefined,
    genomeModifiers: undefined,
    lastScoutedDay: undefined,
  };
}

/**
 * Stable public profile: everything except the private bankroll.
 * @param stable
 */
function publicStableView(stable: Stable): Stable {
  return { ...stable, cash: estimateStableCash(stable) };
}

/**
 * Stable-agnostic work shared by every per-stable observation on a day:
 * the public view of every horse (the expensive part) plus the public
 * player-cash estimate. Build once per day, reuse across stables.
 */
export interface ObservationWorkspace {
  /** Every horse as its public view. */
  publicHorseViews: Map<string, Horse>;
  /** Public estimate of the player's bankroll. */
  publicPlayerCash: number;
}

/**
 * Prepare the daily observation workspace.
 * @param state
 * @param horsesSource - Optional pre-indexed horses (avoids re-reading state.horses)
 */
export function prepareObservationWorkspace(
  state: GameState,
  horsesSource?: Iterable<Horse>,
): ObservationWorkspace {
  const source = horsesSource ?? Object.values(state.horses);
  const publicHorseViews = new Map<string, Horse>();
  for (const horse of source) {
    publicHorseViews.set(horse.id, publicHorseView(horse, state.day));
  }
  return {
    publicHorseViews,
    publicPlayerCash: estimatePublicPlayerCash(state, source),
  };
}

/**
 * Build a stable-agnostic public world view — the observation shared by all
 * agents when evaluating the world itself (e.g. `assessWorldState`). No
 * stable's private AI state or facilities survive; every stable's cash is
 * estimated and every horse is a public view.
 * @param state
 * @param workspace - Optional precomputed daily workspace
 */
export function buildPublicWorldView(
  state: GameState,
  workspace?: ObservationWorkspace,
): NpcObservation {
  return buildNpcObservation(state, PUBLIC_WORLD_OBSERVER, workspace);
}

/**
 * Build the observation snapshot for one NPC stable.
 *
 * The acting stable keeps its own AI state, facilities, breeding programs,
 * private-sale offers and full horse records; everything else is the public
 * world view.
 * @param state - Authoritative game state
 * @param actingStableId - The stable this observation is for
 * @param workspace - Optional precomputed daily workspace
 */
export function buildNpcObservation(
  state: GameState,
  actingStableId: string,
  workspace?: ObservationWorkspace,
): NpcObservation {
  const ws = workspace ?? prepareObservationWorkspace(state);
  const horses: GameState["horses"] = {};
  for (const [id, horse] of ws.publicHorseViews) {
    horses[id as keyof GameState["horses"] & string] = horse;
  }
  if (actingStableId !== PUBLIC_WORLD_OBSERVER) {
    // The acting stable sees its own horses' full records.
    for (const [id, horse] of Object.entries(state.horses)) {
      if (horse.ownership?.type === "npc" && horse.ownership.stableId === actingStableId) {
        horses[id as keyof GameState["horses"] & string] = horse;
      }
    }
  }

  const npcAIManager = state.npcAIManager
    ? {
        ...state.npcAIManager,
        stableStates:
          actingStableId === PUBLIC_WORLD_OBSERVER
            ? {}
            : state.npcAIManager.stableStates[actingStableId]
              ? { [actingStableId]: state.npcAIManager.stableStates[actingStableId] }
              : {},
        pendingNewsItems: [],
      }
    : undefined;

  const observation: GameState = {
    ...state,
    // Player private — ledger, correspondence, plans, intel.
    cash: ws.publicPlayerCash,
    log: [],
    inbox: [],
    transactions: [],
    expenses: [],
    scoutReports: [],
    scoutingAssignments: [],
    playerBiddingHistory: [],
    priceAlerts: [],
    notifiedTradeKeys: [],
    autoSyndicateEnabled: false,
    marketStrategy: { ...DEFAULT_MARKET_STRATEGY },
    savedMatingPlans: [],
    activeBreedingProgram: null,
    syndicateInvestors: {},
    campaigns: [],
    strategyJournal: undefined,
    stableGoals: undefined,
    horseDailyProgress: undefined,
    userSettings: undefined,
    tutorial: undefined,
    trainingUsed: {},
    playerNominations: [],
    awardCeremonyInvitations: [],
    transports: [],
    outposts: [],
    facilities: undefined,
    reservedHorseNames: [],
    lastTopTenRank: undefined,
    consecutiveDaysInDebt: undefined,
    solvencyTier: undefined,
    runEnded: undefined,
    runEndSnapshot: undefined,
    solvencyAuditLog: undefined,
    cashPressureHistory: undefined,
    // Engine internal — execution bookkeeping and unresolved intent queue.
    pendingIntents: [],
    execution: undefined,
    engineRevision: undefined,
    engineGeneration: undefined,
    // Rival private — only the acting stable's own internals survive.
    npcAIManager,
    npcFacilities:
      actingStableId === PUBLIC_WORLD_OBSERVER
        ? {}
        : state.npcFacilities?.[actingStableId as import("@/core/types/branded").StableId]
          ? {
              [actingStableId]:
                state.npcFacilities[actingStableId as import("@/core/types/branded").StableId]!,
            }
          : {},
    npcStables: state.npcStables.map((stable) =>
      stable.id === actingStableId ? stable : publicStableView(stable),
    ),
    breedingPrograms: (state.breedingPrograms ?? []).filter(
      (program) => program.stableId === actingStableId,
    ),
    privateSaleOffers: (state.privateSaleOffers ?? []).filter(
      (offer) => offer.fromStableId === actingStableId || offer.toStableId === actingStableId,
    ),
    horses,
  };

  // Non-enumerable symbol brand: detectable at runtime, invisible to
  // spread/JSON/checksum serialization.
  Object.defineProperty(observation, NPC_OBSERVATION_BRAND, {
    value: "npc-observation",
    enumerable: false,
  });
  return observation as NpcObservation;
}

/**
 * Type guard for the observation brand.
 * @param state
 */
export function isNpcObservation(state: GameState): state is NpcObservation {
  return (state as NpcObservation)[NPC_OBSERVATION_BRAND] === "npc-observation";
}

/**
 * Return `state` unchanged if it is already a branded observation, else build
 * one. Lets call sites normalize either input without double-wrapping.
 * @param state
 * @param actingStableId
 */
export function ensureNpcObservation(state: GameState, actingStableId: string): NpcObservation {
  return isNpcObservation(state) ? state : buildNpcObservation(state, actingStableId);
}
