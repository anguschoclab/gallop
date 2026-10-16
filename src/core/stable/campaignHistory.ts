/**
 * campaignHistory.ts - Derives the player's campaign history (each race start since the
 * campaign start day) with its effect on net worth (prize money), prestige and class wins.
 */
import type { Horse } from "@/core/horse/types";
import type { TrackLedgerEntry } from "@/core/history/trackLedger";
import { PLAYER_LEDGER_STABLE_ID } from "@/core/history/trackLedger";
import { isPlayerOwned } from "@/core/horse/ownership";
import { raceGoalClass, type GoalClass, type StableGoals } from "./stableGoals";

export interface CampaignHistoryRow {
  raceId: string;
  day: number;
  horseId: string;
  horseName: string;
  raceName: string;
  goalClass: GoalClass | null;
  position: number;
  fieldSize?: number;
  prize: number;
  /** Running prize total since the campaign started. */
  cumulativePrize: number;
  /** Player prestige change from this race, null when unrecorded. */
  prestige: number | null;
  cumulativePrestige: number;
  /** True when the win counted toward an open class goal. */
  countedForGoal: boolean;
  /** Running wins in this row's class after this race. */
  classWinsAfter: number;
}

export function buildCampaignHistory(
  goals: Pick<StableGoals, "startDay" | "classGoals">,
  horses: Horse[],
  ledger: TrackLedgerEntry[],
): CampaignHistoryRow[] {
  const prestigeByRace = new Map<string, number>();
  for (const e of ledger) {
    const d = e.prestigeDeltas.find((p) => p.isPlayer || p.stableId === PLAYER_LEDGER_STABLE_ID);
    if (d) prestigeByRace.set(e.raceId, (prestigeByRace.get(e.raceId) ?? 0) + d.delta);
  }
  const raw: Omit<
    CampaignHistoryRow,
    "cumulativePrize" | "cumulativePrestige" | "countedForGoal" | "classWinsAfter"
  >[] = [];
  for (const h of horses) {
    if (!isPlayerOwned(h)) continue;
    for (const r of h.raceHistory ?? []) {
      if (r.day < goals.startDay) continue;
      const g = r.grade === "G1" || r.grade === "G2" || r.grade === "G3" ? r.grade : undefined;
      raw.push({
        raceId: r.raceId,
        day: r.day,
        horseId: h.id,
        horseName: h.name,
        raceName: r.raceName,
        goalClass: raceGoalClass({
          graded: g ? ({ grade: g } as never) : undefined,
          raceClass: r.raceClass as never,
        }),
        position: r.position,
        fieldSize: r.fieldSize,
        prize: r.purseEarned ?? 0,
        prestige: prestigeByRace.has(r.raceId) ? prestigeByRace.get(r.raceId)! : null,
      });
    }
  }
  raw.sort((a, b) => a.day - b.day || a.raceId.localeCompare(b.raceId));
  const wins: Record<GoalClass, number> = { G1: 0, G2: 0, G3: 0, Stakes: 0 };
  const seenPrestige = new Set<string>();
  let prize = 0;
  let prestige = 0;
  return raw.map((r) => {
    prize += r.prize;
    // A race with two player runners shares one ledger delta — count it once.
    let p = r.prestige;
    if (p !== null && seenPrestige.has(r.raceId)) p = 0;
    if (p !== null) seenPrestige.add(r.raceId);
    prestige += p ?? 0;
    let counted = false;
    if (r.goalClass && r.position === 1) {
      counted = wins[r.goalClass] < (goals.classGoals[r.goalClass] ?? 0);
      wins[r.goalClass]++;
    }
    return {
      ...r,
      prestige: p,
      cumulativePrize: prize,
      cumulativePrestige: prestige,
      countedForGoal: counted,
      classWinsAfter: r.goalClass ? wins[r.goalClass] : 0,
    };
  });
}
