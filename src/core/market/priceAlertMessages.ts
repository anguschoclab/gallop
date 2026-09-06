/**
 * priceAlertMessages.ts - Inbox messages for price alerts and trade fills
 *
 * Turns evaluated price-alert triggers and player trade notifications into
 * inbox messages under the "market" category, so the Message Center's Market
 * Alerts tab can surface them alongside the rest of the game's notifications.
 *
 * Dependencies: ./priceAlerts, @/core/inbox/inboxTypes, @/data/tracks
 * Related files: src/game/store/slices/priceAlertSlice.ts
 */

import type { InboxMessage } from "@/core/inbox/inboxTypes";
import { TRACK_BY_ID } from "@/data/tracks";
import { scopeLabel, type PriceAlertTrigger, type TradeNotification } from "./priceAlerts";

export type NewInboxMessage = Omit<InboxMessage, "id" | "readAt">;

const pct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

/** Readable name for a track id, falling back to the id itself. */
function trackName(id: string): string {
  return TRACK_BY_ID[id]?.name ?? id;
}

/**
 * Inbox message for a fired price alert.
 *
 * @param trigger - The alert that fired
 */
export function priceAlertMessage(trigger: PriceAlertTrigger): NewInboxMessage {
  const label = scopeLabel(trigger.scope, trackName);
  const rising = trigger.movePct >= 0;
  const realNote = trigger.realWorldLabel
    ? ` Game trades moved ${pct(trigger.simMovePct)} while the ${trigger.realWorldLabel} moved ${pct(
        trigger.realWorldMovePct,
      )}.`
    : "";
  return {
    day: trigger.day,
    category: "market",
    priority: "action",
    title: `${label}: prices ${rising ? "up" : "down"} ${pct(trigger.movePct)}`,
    body:
      `Average traded price for ${label.toLowerCase()} is now ${money(trigger.current)}, ` +
      `against ${money(trigger.previous)} in the previous window (${trigger.sampleSize} ` +
      `trade${trigger.sampleSize === 1 ? "" : "s"}).${realNote}`,
    cta: { label: "Open the Exchange", route: "/market" },
  };
}

/**
 * Inbox message for one of the player's own trade notifications.
 *
 * @param notification - Fill or fillable-listing notification
 */
export function tradeNotificationMessage(notification: TradeNotification): NewInboxMessage {
  if (notification.kind === "fill") {
    const bought = notification.role === "buyer";
    return {
      day: notification.day,
      category: "market",
      priority: "info",
      title: `${bought ? "Bought" : "Sold"} ${notification.horseName} for ${money(notification.price)}`,
      body: `Your exchange order filled ${bought ? "from" : "to"} ${notification.counterpartyName} at ${money(
        notification.price,
      )}.`,
      cta: { label: "View portfolio", route: "/portfolio" },
    };
  }
  return {
    day: notification.day,
    category: "market",
    priority: "action",
    title: `Bid covers your ask on ${notification.horseName}`,
    body:
      `${notification.bidderName} is bidding ${money(notification.bidPrice)} against your ` +
      `${money(notification.askPrice)} ask. You can take the bid now.`,
    cta: { label: "Open the Exchange", route: "/market" },
  };
}
