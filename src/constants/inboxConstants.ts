export type InboxFilter =
  "all" | "unread" | "action" | "ai_activity" | "critical" | "urgent" | "low" | "info";

export const DEFAULT_INBOX_FILTER: InboxFilter = "all";

export const ACTION_FILTER_EXCLUDED_PRIORITIES = ["info", "low"] as const;

export const ICON_SIZE_SM = "h-4 w-4";

export const ICON_SIZE_PIN = "h-3 w-3";

export const UNREAD_DOT_SIZE = "h-2 w-2";

export const EMPTY_STATE_ICON_SIZE = "h-12 w-12";

export const EMPTY_STATE_ICON_OPACITY = "opacity-20";

export const UNREAD_BADGE_CLASSES = "ml-2 px-1.5 h-4 min-w-[16px]";

export const INBOX_CONTAINER_MAX_WIDTH = "max-w-4xl";

export const PRIORITY_COLOR_CLASSES: Record<string, string> = {
  critical: "bg-red-600/15 border-red-600 text-red-600",
  urgent: "bg-red-500/10 border-red-500 text-red-500",
  action: "bg-gold/10 border-gold text-gold",
  low: "bg-blue-300/10 border-blue-300 text-blue-300",
  info: "bg-blue-500/10 border-blue-500 text-blue-500",
};

export const DEFAULT_PRIORITY_COLOR_CLASS = "bg-blue-500/10 border-blue-500 text-blue-500";

export const PRIORITY_BORDER_CLASSES: Record<string, string> = {
  critical: "border-l-4 border-l-red-600",
  urgent: "border-l-4 border-l-red-500",
  action: "border-l-4 border-l-gold",
  low: "border-l-4 border-l-blue-300",
};

export const STRIP_PRIORITY_BG_CLASSES: Record<string, string> = {
  critical: "bg-red-600/15 text-red-600",
  urgent: "bg-red-500/10 text-red-500",
  action: "bg-gold/10 text-gold",
  low: "bg-blue-300/10 text-blue-300",
};

export const STRIP_DEFAULT_BG_CLASS = "bg-gold/10 text-gold";

export const STRIP_BORDER_CLASSES: Record<string, string> = {
  critical: "border-l-red-600",
  urgent: "border-l-red-500",
  action: "border-l-gold",
  low: "border-l-blue-300",
};

export const STRIP_DEFAULT_BORDER_CLASS = "border-l-gold";
