/**
 * core/inbox/inboxTypes.ts - Inbox/Message Center type definitions
 *
 * This file provides types for the centralized game inbox, including categories,
 * priorities, and the message structure with Call-To-Action (CTA) support.
 */

export type InboxCategory =
  | "foaling"
  | "offer"
  | "race"
  | "deadline"
  | "injury"
  | "auction"
  | "system"
  | "retirement"
  | "hall_of_fame"
  | "standings"
  | "ai_activity"
  | "stewards"
  | "market";

export type InboxPriority = "info" | "low" | "action" | "urgent" | "critical";

/**
 * A message in the player's inbox.
 */
export interface InboxMessage {
  /** Unique message identifier */
  id: string;
  /** Simulation day the message was received */
  day: number;
  /** Simulation day the message was read (optional) */
  readAt?: number;
  /** Simulation day until which the message is pinned (optional) */
  pinnedUntil?: number;
  /** Message category for filtering and iconography */
  category: InboxCategory;
  /** Message priority for visual emphasis */
  priority: InboxPriority;
  /** Primary heading of the message */
  title: string;
  /** Detailed content of the message */
  body: string;
  /** Optional Call-To-Action link for navigation */
  cta?: {
    /** Label for the button */
    label: string;
    /** Target route name (e.g. "stable.$horseId") */
    route: string;
    /** Dynamic route parameters */
    params?: Record<string, string>;
  };
  /** Optional secondary Call-To-Action for additional navigation */
  secondaryCta?: {
    /** Label for the button */
    label: string;
    /** Target route name (e.g. "awards.$category") */
    route: string;
    /** Dynamic route parameters */
    params?: Record<string, string>;
  };
}
