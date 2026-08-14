import type { StandingEntry } from "./computeStandings";

export function buildStandingsRows(
  standings: StandingEntry[],
  playerRank: number,
  limit: number,
): { rows: StandingEntry[]; playerInTop: boolean; topNLength: number } {
  const topN = standings.slice(0, limit);
  const playerInTop = topN.some((s) => s.isPlayer);
  const rows = playerInTop ? topN : [...topN, standings[playerRank - 1]].filter(Boolean);
  return { rows, playerInTop, topNLength: topN.length };
}
