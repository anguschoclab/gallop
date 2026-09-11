/**
 * store/slices/priceAlertSlice.ts - Market price alerts slice
 *
 * Stores the player's price alerts, and each day evaluates them against the
 * exchange trade tape, pushing inbox messages for fired alerts plus the
 * player's own fills and fillable listings.
 *
 * Dependencies: @/core/market/priceAlerts, @/core/market/priceAlertMessages
 * Related files: src/components/market/PriceAlertsPanel.tsx
 */

import type { Horse } from "@/game/types";
import type { InboxMessage } from "@/core/inbox/inboxTypes";
import { generateUUID } from "@/core/uuid";
import { createDefaultExchangeState } from "@/core/market/exchange";
import {
  DEFAULT_ALERT_THRESHOLD_PCT,
  DEFAULT_ALERT_WINDOW_DAYS,
  evaluatePriceAlerts,
  playerTradeNotifications,
  type AlertHorse,
  type PriceAlert,
  type PriceAlertDirection,
  type PriceAlertScope,
} from "@/core/market/priceAlerts";
import { priceAlertMessage, tradeNotificationMessage } from "@/core/market/priceAlertMessages";
import { DEFAULT_MARKET_STRATEGY, type MarketStrategy } from "@/core/market/strategy";
import type { StoreSet, StoreGet } from "../types";

/** How many notified trade keys are retained for de-duplication. */
const MAX_NOTIFIED_KEYS = 400;
/** Inbox cap, matching the rest of the game. */
const MAX_INBOX = 100;

export type PriceAlertSlice = {
  /** Create a new alert and return its id. */
  addPriceAlert: (input: {
    scope: PriceAlertScope;
    direction?: PriceAlertDirection;
    thresholdPct?: number;
    windowDays?: number;
  }) => string;
  /** Remove an alert. */
  removePriceAlert: (id: string) => void;
  /** Enable/disable an alert. */
  togglePriceAlert: (id: string, enabled?: boolean) => void;
  /** Patch an existing alert's thresholds or direction. */
  updatePriceAlert: (id: string, patch: Partial<Omit<PriceAlert, "id">>) => void;
  /** Evaluate alerts and player trade activity for the current day. */
  evaluateMarketAlerts: () => void;
  /** Patch the player's market buying-strategy settings. */
  updateMarketStrategy: (patch: Partial<MarketStrategy>) => void;
};

/**
 * Create the price-alert slice.
 *
 * @param set - Zustand set
 * @param get - Zustand get
 */
export function createPriceAlertSlice(set: StoreSet, get: StoreGet): PriceAlertSlice {
  const alerts = (): PriceAlert[] => get().priceAlerts ?? [];

  return {
    addPriceAlert: ({ scope, direction, thresholdPct, windowDays }) => {
      const s = get();
      const alert: PriceAlert = {
        id: generateUUID(),
        scope,
        direction: direction ?? "either",
        thresholdPct: Math.max(1, thresholdPct ?? DEFAULT_ALERT_THRESHOLD_PCT),
        windowDays: Math.max(1, windowDays ?? DEFAULT_ALERT_WINDOW_DAYS),
        createdDay: s.day,
        enabled: true,
      };
      set({ priceAlerts: [...alerts(), alert] });
      return alert.id;
    },

    removePriceAlert: (id) => {
      set({ priceAlerts: alerts().filter((a) => a.id !== id) });
    },

    togglePriceAlert: (id, enabled) => {
      set({
        priceAlerts: alerts().map((a) =>
          a.id === id ? { ...a, enabled: enabled ?? !a.enabled } : a,
        ),
      });
    },

    updatePriceAlert: (id, patch) => {
      set({ priceAlerts: alerts().map((a) => (a.id === id ? { ...a, ...patch } : a)) });
    },

    evaluateMarketAlerts: () => {
      const s = get();
      const exchange = s.exchange ?? createDefaultExchangeState();
      const configured = alerts();
      const horses = Object.values(s.horses ?? {}) as Horse[];
      const alertHorses: AlertHorse[] = horses.map((h) => ({
        id: h.id,
        name: h.name,
        raceHistory: h.raceHistory,
        courseVisits: h.courseVisits,
      }));

      const triggers = evaluatePriceAlerts({
        alerts: configured,
        trades: exchange.trades,
        horses: alertHorses,
        day: s.day,
      });

      const notifications = playerTradeNotifications({
        trades: exchange.trades,
        asks: exchange.asks,
        bids: exchange.bids,
        day: s.day,
        notifiedKeys: s.notifiedTradeKeys ?? [],
        horses: new Map(Object.values(s.horses).map((h) => [h.id, { name: h.name }])),
      });

      if (triggers.length === 0 && notifications.length === 0) return;

      const newMessages: InboxMessage[] = [
        ...triggers.map(priceAlertMessage),
        ...notifications.map(tradeNotificationMessage),
      ].map((m) => ({ ...m, id: generateUUID() }));

      const triggeredById = new Map(triggers.map((t) => [t.alertId, t]));

      set({
        inbox: [...newMessages, ...(s.inbox ?? [])].slice(0, MAX_INBOX),
        priceAlerts: configured.map((a) => {
          const trigger = triggeredById.get(a.id);
          return trigger ? { ...a, lastTriggeredDay: s.day, lastMovePct: trigger.movePct } : a;
        }),
        notifiedTradeKeys: [
          ...notifications.map((n) => n.key),
          ...(s.notifiedTradeKeys ?? []),
        ].slice(0, MAX_NOTIFIED_KEYS),
      });
    },

    updateMarketStrategy: (patch) => {
      set({
        marketStrategy: {
          ...(get().marketStrategy ?? DEFAULT_MARKET_STRATEGY),
          ...patch,
        },
      });
    },
  };
}
