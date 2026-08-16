/**
 * core/inbox/inboxUtils.tsx - Inbox UI utility functions
 *
 * Provides icon and color class resolution for inbox messages.
 * Extracted from useInbox hook to separate pure UI utilities from state management.
 */

import { Bell, Baby, Activity, Gavel, Calendar, LogOut, Award, Bot } from "lucide-react";
import type { InboxCategory, InboxPriority } from "@/core/inbox/inboxTypes";
import type { ReactNode } from "react";
import {
  ICON_SIZE_SM,
  PRIORITY_COLOR_CLASSES,
  DEFAULT_PRIORITY_COLOR_CLASS,
} from "@/constants/inboxConstants";

export function getCategoryIcon(category: InboxCategory): ReactNode {
  switch (category) {
    case "foaling":
      return <Baby className={ICON_SIZE_SM} />;
    case "injury":
      return <Activity className={ICON_SIZE_SM} />;
    case "auction":
      return <Gavel className={ICON_SIZE_SM} />;
    case "deadline":
      return <Calendar className={ICON_SIZE_SM} />;
    case "offer":
      return <Gavel className={ICON_SIZE_SM} />;
    case "race":
      return <Calendar className={ICON_SIZE_SM} />;
    case "retirement":
      return <LogOut className={ICON_SIZE_SM} />;
    case "hall_of_fame":
      return <Award className={ICON_SIZE_SM} />;
    case "ai_activity":
      return <Bot className={ICON_SIZE_SM} />;
    default:
      return <Bell className={ICON_SIZE_SM} />;
  }
}

export function getPriorityColor(priority: InboxPriority): string {
  return PRIORITY_COLOR_CLASSES[priority] ?? DEFAULT_PRIORITY_COLOR_CLASS;
}
