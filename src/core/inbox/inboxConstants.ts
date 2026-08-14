/**
 * core/inbox/inboxConstants.ts - Shared constants for the inbox system
 *
 * Centralizes filter types, default values, priority thresholds, tooltip delays,
 * icon sizes, and color class strings used across inbox components.
 */

export type InboxFilter = "all" | "unread" | "action";

export const DEFAULT_INBOX_FILTER: InboxFilter = "all";

/** Priority level that is excluded from the "action" filter (info = no action needed) */
export const ACTION_FILTER_EXCLUDED_PRIORITY = "info" as const;

/** Tooltip delay in milliseconds for inbox action buttons */
export const TOOLTIP_DELAY_MS = 300;

/** Standard icon size for inbox message icons */
export const ICON_SIZE_SM = "h-4 w-4";

/** Pin indicator icon size */
export const ICON_SIZE_PIN = "h-3 w-3";

/** Unread dot indicator size */
export const UNREAD_DOT_SIZE = "h-2 w-2";

/** Empty state icon size */
export const EMPTY_STATE_ICON_SIZE = "h-12 w-12";

/** Empty state icon opacity */
export const EMPTY_STATE_ICON_OPACITY = "opacity-20";

/** Unread badge sizing classes */
export const UNREAD_BADGE_CLASSES = "ml-2 px-1.5 h-4 min-w-[16px]";

/** Container max width for inbox page */
export const INBOX_CONTAINER_MAX_WIDTH = "max-w-4xl";

/** Priority-based color class mappings for inbox message icons */
export const PRIORITY_COLOR_CLASSES: Record<string, string> = {
  urgent: "bg-red-500/10 border-red-500 text-red-500",
  action: "bg-gold/10 border-gold text-gold",
  info: "bg-blue-500/10 border-blue-500 text-blue-500",
};

/** Default priority color (used when priority doesn't match any key) */
export const DEFAULT_PRIORITY_COLOR_CLASS = "bg-blue-500/10 border-blue-500 text-blue-500";

/** Priority-based border color classes for urgent message cards */
export const PRIORITY_BORDER_CLASSES: Record<string, string> = {
  urgent: "border-l-4 border-l-red-500",
  action: "border-l-4 border-l-gold",
};

/** Priority-based icon background classes for UrgentMessagesStrip */
export const STRIP_PRIORITY_BG_CLASSES: Record<string, string> = {
  urgent: "bg-red-500/10 text-red-500",
  action: "bg-gold/10 text-gold",
};

/** Default strip background for non-urgent messages */
export const STRIP_DEFAULT_BG_CLASS = "bg-gold/10 text-gold";

/** Strip border color classes */
export const STRIP_BORDER_CLASSES: Record<string, string> = {
  urgent: "border-l-red-500",
  action: "border-l-gold",
};

/** Default strip border for non-urgent messages */
export const STRIP_DEFAULT_BORDER_CLASS = "border-l-gold";
