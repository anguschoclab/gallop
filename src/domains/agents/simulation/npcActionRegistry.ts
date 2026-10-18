import type { GameState, Horse, Race, Stable } from "@/platform/game/types";
import type { AnyIntent } from "@/platform/resolver/intents";
import type { NpcObservation } from "./agentObservation";
import { beliefConfidence, beliefFreshnessDays } from "./agentBeliefs";
import { ACTION_GOAL_MAP } from "./agentGoals";
import type { PlayerFacilities } from "@/domains/facilities/simulation";
import type { StableId } from "@/shared/types/branded";
import type { RaceCompetitorIndex } from "./raceEntryAIScoring";
import type { DifficultyState, NpcAIManager, StableAIState } from "./npcCycleAI";
import type { DistressLevel } from "./financialDistressAI";
import type { SubsystemWeights } from "./strategicCoordinator";
import {
  generateNpcAuctionIntents,
  generateNpcFacilityUpgradeIntents,
  generateNpcOutpostIntents,
  generateNpcTransportIntents,
} from "@/domains/agents/simulation/npc/intents/facilityIntents";
import {
  generateNpcGeldingIntents,
  generateNpcStudFeeIntents,
  generateNpcSyndicateIntents,
} from "@/domains/agents/simulation/npc/intents/breedingIntents";
import {
  generateNpcClaimingIntents,
  generateNpcWithdrawalIntents,
} from "@/domains/agents/simulation/npc/intents/claimingIntents";
import { generateNpcDiplomaticIntents } from "@/domains/agents/simulation/npc/intents/diplomaticIntents";
import { generateNpcInsuranceIntents } from "@/domains/agents/simulation/npc/intents/insuranceIntents";
import { generateNpcRaceEntryIntents } from "@/domains/agents/simulation/npc/intents/raceEntryIntents";
import { generateNpcTrainingIntents } from "@/domains/agents/simulation/npc/intents/trainingIntents";
import { TRAINING_COST, TRAINING_COST_MAP } from "@/shared/constants/workoutConstants";;

export type NpcActionId =
  | "training"
  | "race_entry"
  | "claiming"
  | "withdrawal"
  | "breeding"
  | "diplomacy"
  | "auction_consignment"
  | "transport"
  | "facility_upgrade"
  | "insurance"
  | "outpost";

export interface NpcActionContext {
  /**
   * The acting stable's bounded world view — produced by
   * `buildNpcObservation`, never the raw authoritative state. Hidden fields
   * (player ledgers, rival AI internals, unscouted horse condition) are
   * already redacted.
   */
  state: NpcObservation;
  stable: Stable;
  stableAI?: StableAIState;
  day: number;
  ownedHorses: Horse[];
  relevantRaces: Race[];
  activePregnanciesByDam: Set<string>;
  raceEntrySets: Map<string, Set<string>>;
  raceCompetitorIndex: Map<string, RaceCompetitorIndex>;
  horseMap: Map<string, Horse>;
  weights?: SubsystemWeights;
  distressLevel?: DistressLevel;
  difficultyModulator?: DifficultyState;
  aiManager?: NpcAIManager;
  npcFacilities?: Record<StableId, PlayerFacilities>;
}

export type NpcActionParity = "shared_action" | "npc_world_behavior";
export type NpcActionCadence = "daily" | "weekly" | "conditional";

export interface NpcActionDefinition {
  id: NpcActionId;
  capability: string;
  parity: NpcActionParity;
  cadence: NpcActionCadence;
  cooldownDays: number;
  preconditions: readonly string[];
  candidateSources: readonly string[];
  resourceClaims: readonly string[];
  expectedEffects: readonly string[];
  utilityFeatures: readonly string[];
  intentTypes: readonly AnyIntent["type"][];
  generate: (context: NpcActionContext) => AnyIntent[];
  evaluateOutcome: (context: NpcActionContext, intents: AnyIntent[]) => NpcActionStatus;
}

export type NpcActionStatus = "executed" | "no_candidates" | "failed";

export interface NpcActionTrace {
  stableId: string;
  day: number;
  actionId: NpcActionId;
  capability: string;
  intentTypes: AnyIntent["type"][];
  intentIds: string[];
  intentCount: number;
  status: NpcActionStatus;
  rejectionReason?: string;
  resourceRejectedCount?: number;
}

export interface NpcActionPlan {
  actionId: NpcActionId;
  /** Capability label (kept for trace/ledger compatibility). */
  goal: string;
  /** Active goal type this action serves, when one exists on the stable. */
  goalId?: string;
  /** Horizon of the linked goal, when present. */
  goalHorizon?: "short" | "medium" | "long";
  beliefs: {
    stableId: string;
    day: number;
    confidence: number;
    freshnessDays: number;
    personality: Stable["personality"];
    distressLevel: DistressLevel;
    worldAssessmentAvailable: boolean;
    strategicDirectives: { type: string; weight: number }[];
  };
  resources: {
    cash: number;
    estimatedCost: number;
    budgetAllocation?: StableAIState["budgetAllocation"];
  };
  commitments: AnyIntent[];
  outcome: {
    status: NpcActionStatus;
    intentTypes: AnyIntent["type"][];
    intentIds: string[];
    intentCount: number;
    rejectionReason?: string;
    resourceRejectedCount?: number;
  };
}

const evaluateIntentOutcome: NpcActionDefinition["evaluateOutcome"] = (_context, intents) =>
  intents.length > 0 ? "executed" : "no_candidates";

export const NPC_ACTION_REGISTRY: readonly NpcActionDefinition[] = [
  {
    id: "training",
    capability: "npc.training",
    parity: "shared_action",
    cadence: "daily",
    cooldownDays: 0,
    preconditions: ["owns_horses", "horse_has_capacity", "stable_can_pay"],
    candidateSources: ["owned_horses", "facility_modifiers", "distress"],
    resourceClaims: ["cash", "horse_energy", "training_slot"],
    expectedEffects: ["fitness_delta", "fatigue_delta", "skill_development", "cash_delta"],
    utilityFeatures: ["readiness", "race_schedule", "facility_bonus", "learning_rate"],
    intentTypes: ["training"],
    generate: (context) =>
      generateNpcTrainingIntents(
        context.state,
        context.stable,
        context.stableAI,
        context.day,
        context.ownedHorses,
        context.activePregnanciesByDam,
        context.weights?.training,
        context.distressLevel,
        context.difficultyModulator,
      ),
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "race_entry",
    capability: "npc.race_entry",
    parity: "shared_action",
    cadence: "daily",
    cooldownDays: 0,
    preconditions: ["owns_eligible_horses", "race_available", "entry_window_open"],
    candidateSources: ["relevant_races", "owned_horses", "competitor_index"],
    resourceClaims: ["cash", "horse_entry", "jockey_assignment"],
    expectedEffects: ["race_participation", "earnings_opportunity", "prestige_delta"],
    utilityFeatures: ["race_fit", "competition_strength", "entry_fee", "schedule_spacing"],
    intentTypes: ["race_entry"],
    generate: (context) =>
      generateNpcRaceEntryIntents(
        context.state,
        context.stable,
        context.stableAI,
        context.day,
        context.ownedHorses,
        context.relevantRaces,
        context.raceEntrySets,
        context.horseMap,
        context.weights?.raceEntry,
        context.distressLevel,
        context.difficultyModulator,
        context.raceCompetitorIndex,
      ),
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "claiming",
    capability: "npc.claiming",
    parity: "shared_action",
    cadence: "daily",
    cooldownDays: 0,
    preconditions: ["healthy_finances", "claiming_race_available", "horse_available"],
    candidateSources: ["claiming_races", "market_valuation", "stable_needs"],
    resourceClaims: ["cash", "horse_slot"],
    expectedEffects: ["horse_acquisition", "cash_delta", "roster_change"],
    utilityFeatures: ["estimated_value", "claim_price", "roster_fit", "risk"],
    intentTypes: ["claiming"],
    generate: (context) =>
      context.distressLevel === "healthy" || context.distressLevel === undefined
        ? generateNpcClaimingIntents(
            context.state,
            context.stable,
            context.stableAI,
            context.day,
            context.relevantRaces,
            context.horseMap,
            context.weights?.claiming,
          )
        : [],
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "withdrawal",
    capability: "npc.withdrawal",
    parity: "shared_action",
    cadence: "conditional",
    cooldownDays: 0,
    preconditions: ["entered_or_claimed_horse", "withdrawal_reason"],
    candidateSources: ["entered_races", "claiming_exposure", "horse_condition"],
    resourceClaims: ["race_slot"],
    expectedEffects: ["entry_removed", "claim_exposure_removed", "risk_reduced"],
    utilityFeatures: ["injury_risk", "race_fit", "claim_value_gap"],
    intentTypes: ["withdraw_from_claiming", "race_withdrawal"],
    generate: (context) =>
      generateNpcWithdrawalIntents(
        context.state,
        context.stable,
        context.stableAI,
        context.day,
        context.ownedHorses,
        context.relevantRaces,
        context.horseMap,
      ),
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "breeding",
    capability: "npc.breeding",
    parity: "shared_action",
    cadence: "conditional",
    cooldownDays: 0,
    preconditions: ["owns_breeding_candidates", "breeding_policy_allows"],
    candidateSources: ["owned_horses", "active_pregnancies", "stud_market"],
    resourceClaims: ["cash", "horse_asset", "breeding_access"],
    expectedEffects: ["roster_quality_delta", "breeding_revenue", "future_bloodstock"],
    utilityFeatures: ["genetic_value", "market_price", "distress", "program_capacity"],
    intentTypes: [
      "gelding",
      "syndicate_creation",
      "share_sale",
      "share_purchase",
      "update_stud_fee",
    ],
    generate: (context) => [
      ...generateNpcGeldingIntents(
        context.state,
        context.stable,
        context.stableAI,
        context.day,
        context.ownedHorses,
        context.weights?.breeding,
      ),
      ...generateNpcSyndicateIntents(
        context.state,
        context.stable,
        context.day,
        context.ownedHorses,
        context.distressLevel,
      ),
      ...(context.distressLevel && context.distressLevel !== "healthy"
        ? generateNpcStudFeeIntents(
            context.stable,
            context.day,
            context.ownedHorses,
            context.distressLevel,
          )
        : []),
    ],
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "diplomacy",
    capability: "npc.diplomacy",
    parity: "npc_world_behavior",
    cadence: "conditional",
    cooldownDays: 7,
    preconditions: ["healthy_finances", "relationship_state_available"],
    candidateSources: ["relationships", "cartels", "rivalries", "world_events"],
    resourceClaims: ["relationship_capital", "cash"],
    expectedEffects: ["relationship_delta", "coalition_delta", "information_access"],
    utilityFeatures: ["trust", "prestige", "rivalry", "strategic_need"],
    intentTypes: ["diplomatic_action", "cartel_action"],
    generate: (context) =>
      context.distressLevel === "healthy" || context.distressLevel === undefined
        ? generateNpcDiplomaticIntents(
            context.state,
            context.stable,
            context.stableAI,
            context.day,
            context.aiManager,
          )
        : [],
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "auction_consignment",
    capability: "npc.auction_consignment",
    parity: "shared_action",
    cadence: "weekly",
    cooldownDays: 7,
    preconditions: ["auction_available", "sellable_horse"],
    candidateSources: ["owned_horses", "auction_calendar", "market_prices"],
    resourceClaims: ["horse_asset", "consignment_slot"],
    expectedEffects: ["cash_inflow", "roster_change", "market_supply_delta"],
    utilityFeatures: ["reserve_price", "horse_value", "distress", "roster_pressure"],
    intentTypes: ["consignment"],
    generate: (context) =>
      generateNpcAuctionIntents(
        context.state,
        context.stable,
        context.stableAI,
        context.day,
        context.ownedHorses,
        context.state.auctions ?? [],
        context.weights?.auction,
        context.distressLevel,
        context.difficultyModulator,
      ),
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "transport",
    capability: "npc.transport",
    parity: "shared_action",
    cadence: "conditional",
    cooldownDays: 0,
    preconditions: ["multiple_outposts", "transportable_horse", "stable_can_pay"],
    candidateSources: ["outposts", "owned_horses", "regional_races"],
    resourceClaims: ["cash", "horse_location", "transport_capacity"],
    expectedEffects: ["location_change", "race_access", "travel_fatigue"],
    utilityFeatures: ["regional_fit", "race_calendar", "travel_cost", "recovery_time"],
    intentTypes: ["transport"],
    generate: (context) =>
      (context.stable.outposts?.length ?? 0) > 1
        ? generateNpcTransportIntents(context.stable, context.day, context.ownedHorses)
        : [],
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "facility_upgrade",
    capability: "npc.facility_upgrade",
    parity: "shared_action",
    cadence: "weekly",
    cooldownDays: 7,
    preconditions: ["facility_state_known", "upgrade_available", "stable_can_pay"],
    candidateSources: ["npc_facilities", "facility_roi", "stable_goals"],
    resourceClaims: ["cash", "facility_slot"],
    expectedEffects: ["facility_level_delta", "training_bonus", "operating_cost"],
    utilityFeatures: ["roi", "strategic_fit", "cash_buffer", "current_level"],
    intentTypes: ["facility_upgrade"],
    generate: (context) =>
      generateNpcFacilityUpgradeIntents(
        context.stable,
        context.stableAI,
        context.day,
        context.npcFacilities,
        context.weights?.facility,
      ),
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "insurance",
    capability: "npc.insurance",
    parity: "shared_action",
    cadence: "conditional",
    cooldownDays: 0,
    preconditions: ["insurable_horse", "healthy_finances"],
    candidateSources: ["owned_horses", "horse_value", "injury_risk"],
    resourceClaims: ["cash", "policy_slot"],
    expectedEffects: ["risk_reduction", "premium_expense", "claim_payout"],
    utilityFeatures: ["horse_value", "risk_aversion", "cash_buffer", "policy_cost"],
    intentTypes: ["insurance_purchase", "insurance_claim"],
    generate: (context) =>
      context.distressLevel === "healthy" || context.distressLevel === undefined
        ? generateNpcInsuranceIntents(
            context.state,
            context.stable,
            context.stableAI,
            context.day,
            context.ownedHorses,
          )
        : [],
    evaluateOutcome: evaluateIntentOutcome,
  },
  {
    id: "outpost",
    capability: "npc.outpost",
    parity: "shared_action",
    cadence: "conditional",
    cooldownDays: 30,
    preconditions: ["expansion_budget", "regional_opportunity"],
    candidateSources: ["regions", "stable_cash", "race_calendar"],
    resourceClaims: ["cash", "outpost_capacity"],
    expectedEffects: ["outpost_created", "regional_access", "upkeep_delta"],
    utilityFeatures: ["regional_value", "cash_buffer", "expansion_goal", "maintenance_cost"],
    intentTypes: ["outpost_action"],
    generate: (context) => generateNpcOutpostIntents(context.stable, context.stableAI, context.day),
    evaluateOutcome: evaluateIntentOutcome,
  },
];

function estimateIntentCost(intent: AnyIntent, state: GameState): number {
  switch (intent.type) {
    case "training":
      return TRAINING_COST_MAP[intent.trainingType] ?? TRAINING_COST;
    case "race_entry":
      return state.races[intent.raceId]?.entryFee ?? 0;
    case "breeding":
      return intent.fee ?? 0;
    case "purchase":
      return intent.price;
    case "claiming":
      return intent.claimingPrice;
    case "transport":
    case "facility_upgrade":
    case "outpost_action":
      return intent.cost;
    case "staff":
      return intent.action === "hire" ? intent.salary : 0;
    case "share_purchase":
      return intent.shares * intent.pricePerShare;
    default:
      return 0;
  }
}

export function generateNpcActions(context: NpcActionContext): {
  intents: AnyIntent[];
  traces: NpcActionTrace[];
  plans: NpcActionPlan[];
} {
  const intents: AnyIntent[] = [];
  const traces: NpcActionTrace[] = [];
  const plans: NpcActionPlan[] = [];
  let remainingCash = context.stable.cash;

  for (const action of NPC_ACTION_REGISTRY) {
    let generatedIntents: AnyIntent[] = [];
    let actionIntents: AnyIntent[] = [];
    let status: NpcActionStatus = "no_candidates";
    let rejectionReason: string | undefined;
    let resourceRejectedCount = 0;
    try {
      generatedIntents = action.generate(context);
      actionIntents = generatedIntents.filter((intent) => {
        const estimatedCost = estimateIntentCost(intent, context.state);
        if (estimatedCost > remainingCash) {
          resourceRejectedCount += 1;
          return false;
        }
        remainingCash -= estimatedCost;
        return true;
      });
      intents.push(...actionIntents);
      status = action.evaluateOutcome(context, actionIntents);
    } catch (error) {
      status = "failed";
      rejectionReason = error instanceof Error ? error.message : String(error);
    }

    if (resourceRejectedCount > 0) {
      rejectionReason = `insufficient_cash_for_${resourceRejectedCount}_commitments`;
    }

    const intentTypes = [...new Set(actionIntents.map((intent) => intent.type))];
    const intentIds = actionIntents.map((intent) => intent.id);

    // Typed belief model preferred; fall back to the world-assessment
    // heuristic for contexts built without a belief store.
    const beliefSet = context.stableAI?.beliefs;
    const confidence = beliefSet
      ? beliefConfidence(beliefSet.playerDominance, context.day)
      : context.stableAI?.worldAssessment
        ? 1
        : 0.6;
    const freshnessDays = beliefSet
      ? beliefFreshnessDays(beliefSet.playerDominance, context.day)
      : Math.max(0, context.day - (context.stableAI?.lastUpdateDay ?? context.day));

    const goalType = ACTION_GOAL_MAP[action.id];
    const activeGoal = context.stableAI?.goals?.find(
      (goal) => goal.type === goalType && goal.status === "active",
    );

    traces.push({
      stableId: context.stable.id,
      day: context.day,
      actionId: action.id,
      capability: action.capability,
      intentTypes,
      intentIds,
      intentCount: actionIntents.length,
      status,
      rejectionReason,
      resourceRejectedCount,
    });
    plans.push({
      actionId: action.id,
      goal: action.capability,
      goalId: activeGoal?.id,
      goalHorizon: activeGoal?.horizon,
      beliefs: {
        stableId: context.stable.id,
        day: context.day,
        confidence,
        freshnessDays,
        personality: context.stable.personality,
        distressLevel: context.distressLevel ?? "healthy",
        worldAssessmentAvailable: context.stableAI?.worldAssessment !== undefined,
        strategicDirectives:
          context.stableAI?.strategicDirectives?.map((directive) => ({
            type: directive.type,
            weight: directive.weight,
          })) ?? [],
      },
      resources: {
        cash: context.stable.cash,
        estimatedCost: actionIntents.reduce(
          (total, intent) => total + estimateIntentCost(intent, context.state),
          0,
        ),
        budgetAllocation: context.stableAI?.budgetAllocation,
      },
      commitments: actionIntents,
      outcome: {
        status,
        intentTypes,
        intentIds,
        intentCount: actionIntents.length,
        rejectionReason,
        resourceRejectedCount,
      },
    });
  }

  return { intents, traces, plans };
}
