import type { GameState } from "@/game/types";
import { PRIZE_SPLIT, GRADED_PRIZE_SPLIT } from "@/constants";

const PLAYER_ID = "__player__";

export interface StandingEntry {
  stableId: string;
  name: string;
  isPlayer: boolean;
  silkColor?: string;
  rangePrizeMoney: number;
  sparkline: number[];
  prestige: number;
  winsVsPlayer: number;
  recentResults: {
    raceName: string;
    position: number;
    day: number;
    purseEarned: number;
  }[];
}

export interface ComputeStandingsResult {
  standings: StandingEntry[];
  playerRank: number;
}

export function computeSeasonStandings(
  state: GameState,
  rangeDays: number,
): ComputeStandingsResult {
  const day = state.day;
  const windowStart = day - rangeDays + 1;
  const totals = new Map<string, {
    range: number;
    sparkline: number[];
    recent: { raceName: string; position: number; day: number; purseEarned: number }[];
  }>();

  const bucket = (id: string) => {
    let b = totals.get(id);
    if (!b) {
      b = { range: 0, sparkline: new Array(rangeDays).fill(0), recent: [] };
      totals.set(id, b);
    }
    return b;
  };

  for (const h of Object.values(state.horses)) {
    for (const r of h.raceHistory ?? []) {
      const earned = r.purseEarned ?? computeFallbackPurse(r);
      if (!earned) continue;
      const key = r.stableId || (h.owned ? PLAYER_ID : null);
      if (!key) continue;
      const b = bucket(key);
      if (r.day >= windowStart && r.day <= day) {
        const idx = Math.min(rangeDays - 1, Math.max(0, r.day - windowStart));
        b.sparkline[idx] += earned;
        b.range += earned;
      }
      b.recent.push({ raceName: r.raceName, position: r.position, day: r.day, purseEarned: earned });
    }
  }

  const list: StandingEntry[] = [];

  const playerBucket = totals.get(PLAYER_ID);
  const playerProfile = state.playerProfile;
  list.push({
    stableId: PLAYER_ID,
    name: playerProfile?.stableName ?? "Your stable",
    isPlayer: true,
    silkColor: playerProfile?.silk?.primary,
    rangePrizeMoney: playerBucket?.range ?? 0,
    sparkline: playerBucket?.sparkline ?? new Array(rangeDays).fill(0),
    prestige: 0,
    winsVsPlayer: 0,
    recentResults: (playerBucket?.recent ?? [])
      .sort((a, b) => b.day - a.day)
      .slice(0, 5),
  });

  for (const s of state.npcStables ?? []) {
    const b = totals.get(s.id);
    const ai = state.npcAIManager?.stableStates?.[s.id];
    const prestige = ai?.regionalPrestige
      ? Object.values(ai.regionalPrestige).reduce(
          (acc: number, v: number) => acc + (Number(v) || 0),
          0,
        )
      : 0;
    list.push({
      stableId: s.id,
      name: s.name,
      isPlayer: false,
      silkColor: s.colors?.primary,
      rangePrizeMoney: b?.range ?? 0,
      sparkline: b?.sparkline ?? new Array(rangeDays).fill(0),
      prestige,
      winsVsPlayer: ai?.winsAgainstPlayer ?? 0,
      recentResults: (b?.recent ?? [])
        .sort((a, c) => c.day - a.day)
        .slice(0, 5),
    });
  }

  list.sort((a, b) => b.rangePrizeMoney - a.rangePrizeMoney);

  const playerRank = list.findIndex((s) => s.isPlayer) + 1;

  return { standings: list, playerRank };
}

function computeFallbackPurse(r: NonNullable<import("@/game/types").Horse["raceHistory"]>[number]): number {
  if (!r.purse || !r.position || r.position < 1) return 0;
  const split = r.grade ? GRADED_PRIZE_SPLIT : PRIZE_SPLIT;
  if (r.position - 1 >= split.length) return 0;
  return Math.round(r.purse * split[r.position - 1]);
}
