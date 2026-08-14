import type { GameState } from "@/game/types";
import { horseMarketValue } from "@/core/horse/pricing";

const PLAYER_ID = "__player__";

export interface WealthStandingEntry {
  stableId: string;
  name: string;
  isPlayer: boolean;
  silkColor?: string;
  cash: number;
  horseAssets: number;
  totalWealth: number;
  horseCount: number;
  topHorseValue: number;
}

export interface ComputeWealthStandingsResult {
  standings: WealthStandingEntry[];
  playerRank: number;
}

export type WealthStandingsState = Pick<
  GameState,
  "cash" | "horses" | "npcStables" | "playerProfile"
>;

export function computeWealthStandings(state: WealthStandingsState): ComputeWealthStandingsResult {
  const allHorsesArray = Object.values(state.horses);

  const totals = new Map<
    string,
    {
      horseAssets: number;
      horseCount: number;
      topHorseValue: number;
    }
  >();

  const bucket = (id: string) => {
    let b = totals.get(id);
    if (!b) {
      b = { horseAssets: 0, horseCount: 0, topHorseValue: 0 };
      totals.set(id, b);
    }
    return b;
  };

  for (const horse of allHorsesArray) {
    const key = horse.owned ? PLAYER_ID : horse.stableId;
    if (!key) continue;

    const value = horseMarketValue(horse, allHorsesArray);
    const b = bucket(key);
    b.horseAssets += value;
    b.horseCount += 1;
    if (value > b.topHorseValue) b.topHorseValue = value;
  }

  const list: WealthStandingEntry[] = [];

  const playerBucket = totals.get(PLAYER_ID);
  const playerProfile = state.playerProfile;
  list.push({
    stableId: PLAYER_ID,
    name: playerProfile?.stableName ?? "Your stable",
    isPlayer: true,
    silkColor: playerProfile?.silk?.primary,
    cash: state.cash,
    horseAssets: playerBucket?.horseAssets ?? 0,
    totalWealth: state.cash + (playerBucket?.horseAssets ?? 0),
    horseCount: playerBucket?.horseCount ?? 0,
    topHorseValue: playerBucket?.topHorseValue ?? 0,
  });

  for (const stable of state.npcStables ?? []) {
    const b = totals.get(stable.id);
    const horseAssets = b?.horseAssets ?? 0;
    list.push({
      stableId: stable.id,
      name: stable.name,
      isPlayer: false,
      silkColor: stable.colors?.primary,
      cash: stable.cash,
      horseAssets,
      totalWealth: stable.cash + horseAssets,
      horseCount: b?.horseCount ?? 0,
      topHorseValue: b?.topHorseValue ?? 0,
    });
  }

  list.sort((a, b) => b.totalWealth - a.totalWealth);

  const playerRank = list.findIndex((s) => s.isPlayer) + 1;

  return { standings: list, playerRank };
}
