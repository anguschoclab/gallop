/**
 * hooks/inbox/useInbox.ts - Inbox state management hook
 *
 * Encapsulates inbox filtering, sorting, and store action passthrough.
 * UI utilities (getCategoryIcon, getPriorityColor) are re-exported from
 * core/inbox/inboxUtils for backward compatibility.
 */

import { useState, useMemo } from "react";
import { useGame, type StoreType } from "@/game/store";
import {
  DEFAULT_INBOX_FILTER,
  ACTION_FILTER_EXCLUDED_PRIORITIES,
  type InboxFilter,
} from "@/constants/inboxConstants";
import { getCategoryIcon, getPriorityColor } from "@/core/inbox/inboxUtils";

export { getCategoryIcon, getPriorityColor };

export function useUnreadCount(): number {
  return useGame((s: StoreType) => s.inbox.filter((m) => !m.readAt).length);
}

export function useInbox() {
  const day = useGame((s: StoreType) => s.day);
  const inbox = useGame((s: StoreType) => s.inbox);
  const markRead = useGame((s: StoreType) => s.markMessageRead);
  const markAllRead = useGame((s: StoreType) => s.markAllMessagesRead);
  const dismiss = useGame((s: StoreType) => s.dismissMessage);
  const [filter, setFilter] = useState<InboxFilter>(DEFAULT_INBOX_FILTER);

  const filteredMessages = useMemo(
    () =>
      inbox
        .filter((m) => {
          if (filter === "unread") return !m.readAt;
          if (filter === "action") return !ACTION_FILTER_EXCLUDED_PRIORITIES.includes(m.priority);
          if (filter === "ai_activity") return m.category === "ai_activity";
          if (filter === "critical") return m.priority === "critical";
          if (filter === "urgent") return m.priority === "urgent";
          if (filter === "low") return m.priority === "low";
          if (filter === "info") return m.priority === "info";
          return true;
        })
        .sort((a, b) => {
          const aPinned = a.pinnedUntil && a.pinnedUntil >= day;
          const bPinned = b.pinnedUntil && b.pinnedUntil >= day;
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          return b.day - a.day;
        }),
    [inbox, filter, day],
  );

  return {
    day,
    inbox,
    filter,
    setFilter,
    filteredMessages,
    markRead,
    markAllRead,
    dismiss,
    getCategoryIcon,
    getPriorityColor,
  };
}
