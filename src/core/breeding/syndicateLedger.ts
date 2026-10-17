/**
 * syndicateLedger.ts - Historical ledger for the player's syndicate holdings.
 *
 * Two histories back the Syndicate ledger panel:
 *   - `SyndicateValueSnapshot[]` — a daily record of the player's shares,
 *     share price and stake value per syndicate (written by the daily
 *     snapshot phase).
 *   - `shareActivityFeed` items of type "fee_distribution" — each records the
 *     player's payout from a stud-fee distribution (written by the
 *     SyndicationHandler).
 * `syndicateLedgerTimeSeries` merges them into a chartable series.
 *
 * Dependencies: ./types (Syndicate, ShareActivityFeedItem)
 * Related files: src/core/time/phases/dailySnapshotPhase.ts (snapshot writer),
 *   src/core/resolver/handlers/SyndicationHandler.ts (feed writer),
 *   src/components/syndicates/SyndicateLedgerPanel.tsx (consumer)
 */
import type { ShareActivityFeedItem, Syndicate } from "./types";

/** Keys that historically identified the player inside shareholder maps. */
const PLAYER_SYNDICATE_KEYS = ["player", "__player__"];

export const SYNDICATE_SNAPSHOT_MAX = 1500;

export interface SyndicateValueSnapshot {
  syndicateId: string;
  stallionName: string;
  day: number;
  sharePrice: number;
  /** Player's shares on that day. */
  playerShares: number;
  /** playerShares × sharePrice on that day. */
  stakeValue: number;
}

export function playerSharesIn(syndicate: Syndicate): number {
  let shares = 0;
  for (const key of PLAYER_SYNDICATE_KEYS) {
    shares += syndicate.shareHolders?.[key as keyof typeof syndicate.shareHolders] ?? 0;
  }
  return shares;
}

/**
 * Value snapshots for every syndicate the player holds shares in, for `day`.
 * @param syndicates - Syndicate map from game state (may be undefined)
 * @param day - Game day the snapshot represents
 */
export function playerSyndicateSnapshots(
  syndicates: Record<string, Syndicate> | undefined,
  day: number,
): SyndicateValueSnapshot[] {
  const out: SyndicateValueSnapshot[] = [];
  for (const syn of Object.values(syndicates ?? {})) {
    const playerShares = playerSharesIn(syn);
    if (playerShares <= 0) continue;
    out.push({
      syndicateId: syn.id,
      stallionName: syn.stallionName,
      day,
      sharePrice: syn.sharePrice || 0,
      playerShares,
      stakeValue: playerShares * (syn.sharePrice || 0),
    });
  }
  return out;
}

/**
 * Merge new snapshots into the persisted list. A snapshot for the same
 * (day, syndicateId) replaces the earlier one so re-running a day is
 * idempotent; the list is capped at `SYNDICATE_SNAPSHOT_MAX`, newest kept.
 *
 * @param existing - Persisted snapshots (may be undefined)
 * @param entries - Snapshots to append for the current day
 */
export function appendSyndicateValueSnapshots(
  existing: SyndicateValueSnapshot[] | undefined,
  entries: SyndicateValueSnapshot[],
): SyndicateValueSnapshot[] {
  if (entries.length === 0) return existing ? [...existing] : [];
  const incoming = new Set(entries.map((e) => `${e.day}:${e.syndicateId}`));
  const merged = [
    ...(existing ?? []).filter((e) => !incoming.has(`${e.day}:${e.syndicateId}`)),
    ...entries,
  ];
  return merged.slice(-SYNDICATE_SNAPSHOT_MAX);
}

export interface SyndicateTimeSeriesPoint {
  day: number;
  /** Player's stake value on that day. */
  stakeValue: number;
  /** Running total of the player's fee-distribution payouts up to that day. */
  cumulativePlayerIncome: number;
}

/**
 * Day-sorted stake value series for one syndicate with the player's cumulative
 * syndicate income (fee distributions) overlaid.
 *
 * @param snapshots - Persisted `syndicateValueSnapshots`
 * @param feed - `shareActivityFeed` items (fee_distribution carries income)
 * @param syndicateId - Syndicate to chart
 */
export function syndicateLedgerTimeSeries(
  snapshots: SyndicateValueSnapshot[] | undefined,
  feed: ShareActivityFeedItem[] | undefined,
  syndicateId: string,
): SyndicateTimeSeriesPoint[] {
  const points = (snapshots ?? [])
    .filter((s) => s.syndicateId === syndicateId)
    .sort((a, b) => a.day - b.day);
  if (points.length === 0) return [];

  const income = (feed ?? [])
    .filter((f) => f.type === "fee_distribution" && f.syndicateId === syndicateId)
    .map((f) => ({ day: f.day, amount: f.cashMoved }))
    .sort((a, b) => a.day - b.day);

  let cumulative = 0;
  let idx = 0;
  return points.map((p) => {
    while (idx < income.length && income[idx].day <= p.day) {
      cumulative += income[idx].amount;
      idx++;
    }
    return { day: p.day, stakeValue: p.stakeValue, cumulativePlayerIncome: cumulative };
  });
}
