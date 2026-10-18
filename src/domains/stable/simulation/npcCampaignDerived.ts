/**
 * npcCampaignDerived.ts - Derived campaign metrics for NPC stables.
 *
 * NPC stables don't carry a StableGoals object, but their campaign footprint
 * (net worth, cash, class wins, earnings) can be derived from the stable
 * record and its horses' race histories so the player can compare progress
 * over the same window (the player's campaign `startDay`).
 *
 * Dependencies: @/core/stable/types (Stable), @/core/horse/types (Horse),
 *   @/core/horse/pricing (horseMarketValue), ./stableGoals (GoalClass, GoalProgress, raceHistoryGoalClass)
 * Related files: src/components/stable/NpcStableCampaignTab.tsx (consumer)
 */
import type { Horse } from "@/domains/horse/simulation/types";
import type { Stable } from "@/domains/stable/simulation/types";
import { horseMarketValue } from "@/domains/horse/simulation/pricing";
import {
  GOAL_CLASSES,
  raceHistoryGoalClass,
  type GoalClass,
  type GoalProgress,
} from "@/domains/stable/simulation/stableGoals";

export interface NpcCampaignProgress {
  /** Liquid cash on the stable's books. */
  cash: number;
  /** Cash + current market value of the stable's roster. */
  netWorth: number;
  /** Wins per goal class since the comparison startDay. */
  classWins: Record<GoalClass, number>;
  /** Starts in the comparison window. */
  totalStarts: number;
  /** Wins of any class in the comparison window. */
  wins: number;
  /** Prize money earned in the comparison window. */
  totalEarnings: number;
  /** Mean finishing position in the window (0 when unraced). */
  avgFinish: number;
}

/**
 * Derive a rival stable's campaign metrics for a window starting at `startDay`.
 *
 * @param stable - NPC stable (cash is taken from the record)
 * @param horses - Horses currently owned by the stable
 * @param startDay - First day of the comparison window (player campaign start)
 */
export function deriveNpcCampaignProgress(
  stable: Pick<Stable, "cash">,
  horses: Horse[],
  startDay = 0,
): NpcCampaignProgress {
  const classWins: Record<GoalClass, number> = { G1: 0, G2: 0, G3: 0, Stakes: 0 };
  let netWorth = stable.cash;
  let totalStarts = 0;
  let wins = 0;
  let totalEarnings = 0;
  let positionSum = 0;
  for (const h of horses) {
    if (h?.stats && h.lifecycleStatus !== "deceased") {
      netWorth += horseMarketValue(h, horses);
    }
    for (const r of h.raceHistory ?? []) {
      if (r.day < startDay) continue;
      totalStarts++;
      positionSum += r.position;
      totalEarnings += r.purseEarned ?? 0;
      if (r.position !== 1) continue;
      wins++;
      const c = raceHistoryGoalClass(r.grade, r.raceClass);
      if (c) classWins[c]++;
    }
  }
  return {
    cash: stable.cash,
    netWorth: Math.round(netWorth),
    classWins,
    totalStarts,
    wins,
    totalEarnings,
    avgFinish: totalStarts ? positionSum / totalStarts : 0,
  };
}

export interface CampaignComparisonRow {
  label: string;
  rival: number;
  player: number;
  /** player − rival; positive means the player is ahead. */
  delta: number;
}

/**
 * Line up a rival's derived campaign against the player's live goal progress.
 * Monetary rows come first, then one row per goal class.
 *
 * @param npc - Derived rival campaign metrics
 * @param player - Player goal progress from `goalProgress()`
 */
export function compareWithPlayer(
  npc: NpcCampaignProgress,
  player: GoalProgress,
): CampaignComparisonRow[] {
  const rows: CampaignComparisonRow[] = [
    { label: "Net worth", rival: npc.netWorth, player: player.netWorth, delta: 0 },
    { label: "Cash on hand", rival: npc.cash, player: player.currentCash, delta: 0 },
    {
      label: "Prize earnings",
      rival: npc.totalEarnings,
      player: player.totalEarnings,
      delta: 0,
    },
  ];
  for (const c of GOAL_CLASSES) {
    rows.push({
      label: `${c} wins`,
      rival: npc.classWins[c],
      player: player.classWins[c],
      delta: 0,
    });
  }
  return rows.map((r) => ({ ...r, delta: r.player - r.rival }));
}
