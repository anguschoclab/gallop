/**
 * priceAlerts.ts - Price alerts and trade notifications for the bloodstock market
 *
 * Players can watch the whole market, a grade segment (G1/G2/G3/Listed/Ungraded)
 * or a single track's horses, and be notified when the traded price index of that
 * segment moves beyond a percentage threshold. The same module derives
 * notifications for the player's own order activity: trades they were part of
 * and listings a standing bid can now fill.
 *
 * Pure logic only - no store access, no mutation of inputs.
 *
 * Dependencies: ./exchange (ExchangeAsk, ExchangeBid, ExchangeTrade)
 * Related files: src/game/store/slices/priceAlertSlice.ts,
 *   src/components/market/PriceAlertsPanel.tsx
 */

import type { ExchangeAsk, ExchangeBid, ExchangeTrade } from "./exchange";

/** Which slice of the market an alert watches. */
export type PriceAlertScope =
  { kind: "market" } | { kind: "grade"; value: string } | { kind: "track"; value: string };

/** Which direction of move should fire the alert. */
export type PriceAlertDirection = "up" | "down" | "either";

export type PriceAlert = {
  id: string;
  scope: PriceAlertScope;
  direction: PriceAlertDirection;
  /** Absolute percentage move that fires the alert (e.g. 10 = 10%). */
  thresholdPct: number;
  /** Length of the comparison window in days. */
  windowDays: number;
  createdDay: number;
  enabled: boolean;
  /** Day the alert last fired (drives the cooldown). */
  lastTriggeredDay?: number;
  /** Signed move percentage recorded at the last firing. */
  lastMovePct?: number;
};

/** Days an alert stays quiet after firing, so one swing fires once. */
export const PRICE_ALERT_COOLDOWN_DAYS = 5;
/** Default comparison window for a new alert. */
export const DEFAULT_ALERT_WINDOW_DAYS = 7;
/** Default threshold for a new alert. */
export const DEFAULT_ALERT_THRESHOLD_PCT = 10;
/** Grade buckets an alert can watch, best first. */
export const GRADE_SEGMENTS = ["G1", "G2", "G3", "Listed", "Ungraded"] as const;

/** Minimal horse shape this module needs. */
export type AlertHorse = {
  id: string;
  name: string;
  raceHistory?: { grade?: string }[];
  courseVisits?: Record<string, number>;
};

/**
 * Human label for an alert scope.
 * @param scope
 * @param trackName
 */
export function scopeLabel(scope: PriceAlertScope, trackName?: (id: string) => string): string {
  if (scope.kind === "market") return "Whole market";
  if (scope.kind === "grade") return `${scope.value} horses`;
  return trackName ? trackName(scope.value) : scope.value;
}

/**
 * Stable key for a scope, used for de-duplication.
 * @param scope
 */
export function scopeKey(scope: PriceAlertScope): string {
  return scope.kind === "market" ? "market" : `${scope.kind}:${scope.value}`;
}

/**
 * Best grade bucket a horse has contested (G1 beats G2 beats …).
 * @param horse
 */
export function horseGradeSegment(horse: AlertHorse): string {
  for (const grade of GRADE_SEGMENTS) {
    if (grade === "Ungraded") break;
    if (horse.raceHistory?.some((r) => r.grade === grade)) return grade;
  }
  return "Ungraded";
}

/**
 * The track a horse is most associated with (most visits), if any.
 * @param horse
 */
export function horseTrackSegment(horse: AlertHorse): string | undefined {
  const entries = Object.entries(horse.courseVisits ?? {});
  if (entries.length === 0) return undefined;
  return entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function inScope(horse: AlertHorse | undefined, scope: PriceAlertScope): boolean {
  if (scope.kind === "market") return true;
  if (!horse) return false;
  if (scope.kind === "grade") return horseGradeSegment(horse) === scope.value;
  return horseTrackSegment(horse) === scope.value;
}

export type SegmentIndex = {
  /** Average trade price over the current window. */
  current: number;
  /** Average trade price over the window immediately before it. */
  previous: number;
  /** Signed percentage change from previous to current (0 when no baseline). */
  movePct: number;
  /** Trades in the current window. */
  sampleSize: number;
  /** Trades in the previous window. */
  baselineSize: number;
};

/**
 * Price index of a market segment: average traded price this window versus the
 * window before it.
 *
 * @param args - Inputs
 * @param args.trades - Exchange trade tape
 * @param args.horses - Horses referenced by the tape
 * @param args.scope - Segment to measure
 * @param args.day - Current day (window ends here, inclusive)
 * @param args.windowDays - Window length in days
 */
export function segmentPriceIndex(args: {
  trades: ExchangeTrade[];
  horses: AlertHorse[];
  scope: PriceAlertScope;
  day: number;
  windowDays?: number;
}): SegmentIndex {
  const { trades, horses, scope, day } = args;
  const windowDays = Math.max(1, args.windowDays ?? DEFAULT_ALERT_WINDOW_DAYS);
  const byId = new Map(horses.map((h) => [h.id, h]));
  const scoped = trades.filter((t) => inScope(byId.get(t.horseId), scope));

  const currentFrom = day - windowDays + 1;
  const prevFrom = currentFrom - windowDays;
  const currentTrades = scoped.filter((t) => t.day >= currentFrom && t.day <= day);
  const previousTrades = scoped.filter((t) => t.day >= prevFrom && t.day < currentFrom);

  const avg = (list: ExchangeTrade[]) =>
    list.length > 0 ? Math.round(list.reduce((sum, t) => sum + t.price, 0) / list.length) : 0;

  const current = avg(currentTrades);
  const previous = avg(previousTrades);
  const movePct = previous > 0 && current > 0 ? ((current - previous) / previous) * 100 : 0;

  return {
    current,
    previous,
    movePct,
    sampleSize: currentTrades.length,
    baselineSize: previousTrades.length,
  };
}

export type PriceAlertTrigger = {
  alertId: string;
  scope: PriceAlertScope;
  day: number;
  movePct: number;
  current: number;
  previous: number;
  sampleSize: number;
};

/**
 * Evaluate every enabled alert against the tape and return the ones that fire.
 * Alerts respect a cooldown so a single swing does not notify every day.
 *
 * @param args - Inputs
 * @param args.alerts - Configured alerts
 * @param args.trades - Exchange trade tape
 * @param args.horses - Horses referenced by the tape
 * @param args.day - Current day
 */
export function evaluatePriceAlerts(args: {
  alerts: PriceAlert[];
  trades: ExchangeTrade[];
  horses: AlertHorse[];
  day: number;
}): PriceAlertTrigger[] {
  const { alerts, trades, horses, day } = args;
  const out: PriceAlertTrigger[] = [];
  for (const alert of alerts) {
    if (!alert.enabled) continue;
    if (
      alert.lastTriggeredDay !== undefined &&
      day - alert.lastTriggeredDay < PRICE_ALERT_COOLDOWN_DAYS
    )
      continue;
    const index = segmentPriceIndex({
      trades,
      horses,
      scope: alert.scope,
      day,
      windowDays: alert.windowDays,
    });
    if (index.sampleSize === 0 || index.baselineSize === 0) continue;
    const move = index.movePct;
    if (Math.abs(move) < alert.thresholdPct) continue;
    if (alert.direction === "up" && move <= 0) continue;
    if (alert.direction === "down" && move >= 0) continue;
    out.push({
      alertId: alert.id,
      scope: alert.scope,
      day,
      movePct: move,
      current: index.current,
      previous: index.previous,
      sampleSize: index.sampleSize,
    });
  }
  return out;
}

/** A notification about the player's own trading activity. */
export type TradeNotification =
  | {
      kind: "fill";
      /** Trade id — also the de-duplication key. */
      key: string;
      role: "buyer" | "seller";
      horseName: string;
      price: number;
      counterpartyName: string;
      day: number;
    }
  | {
      kind: "fillable";
      /** Ask id + bid id — de-duplication key. */
      key: string;
      horseName: string;
      askPrice: number;
      bidPrice: number;
      bidderName: string;
      day: number;
    };

/**
 * Notifications for the player's order activity: trades that settled with the
 * player on one side, and listings a standing bid now covers.
 *
 * @param args - Inputs
 * @param args.trades - Exchange trade tape
 * @param args.asks - Live asks
 * @param args.bids - Live bids
 * @param args.day - Current day
 * @param args.notifiedKeys - Keys already notified (skipped)
 * @param args.playerId - Player order id (defaults to "player")
 */
export function playerTradeNotifications(args: {
  trades: ExchangeTrade[];
  asks: ExchangeAsk[];
  bids: ExchangeBid[];
  day: number;
  notifiedKeys?: string[];
  playerId?: string;
}): TradeNotification[] {
  const { trades, asks, bids, day } = args;
  const playerId = args.playerId ?? "player";
  const seen = new Set(args.notifiedKeys ?? []);
  const out: TradeNotification[] = [];

  for (const trade of trades) {
    if (trade.day !== day) continue;
    const isBuyer = trade.buyerId === playerId;
    const isSeller = trade.sellerId === playerId;
    if (!isBuyer && !isSeller) continue;
    if (seen.has(trade.id)) continue;
    out.push({
      kind: "fill",
      key: trade.id,
      role: isBuyer ? "buyer" : "seller",
      horseName: trade.horseName,
      price: trade.price,
      counterpartyName: isBuyer ? trade.sellerName : trade.buyerName,
      day,
    });
  }

  for (const ask of asks) {
    if (ask.sellerId !== playerId || ask.expiresDay < day) continue;
    const best = bids
      .filter((b) => b.horseId === ask.horseId && b.bidderId !== playerId && b.expiresDay >= day)
      .sort((a, b) => b.price - a.price)[0];
    if (!best || best.price < ask.price) continue;
    const key = `${ask.id}:${best.id}`;
    if (seen.has(key)) continue;
    out.push({
      kind: "fillable",
      key,
      horseName: ask.horseId,
      askPrice: ask.price,
      bidPrice: best.price,
      bidderName: best.bidderName,
      day,
    });
  }

  return out;
}
