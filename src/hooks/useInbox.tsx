import { useState, useMemo } from "react";
import { useGame, type StoreType } from "@/game/store";
import {
  Bell,
  Baby,
  Activity,
  Gavel,
  Calendar,
  LogOut,
  Award,
} from "lucide-react";
import type { InboxCategory, InboxPriority } from "@/core/inbox/inboxTypes";
import type { ReactNode } from "react";

export function getCategoryIcon(category: InboxCategory): ReactNode {
  switch (category) {
    case "foaling":
      return <Baby className="h-4 w-4" />;
    case "injury":
      return <Activity className="h-4 w-4" />;
    case "auction":
      return <Gavel className="h-4 w-4" />;
    case "deadline":
      return <Calendar className="h-4 w-4" />;
    case "offer":
      return <Gavel className="h-4 w-4" />;
    case "race":
      return <Calendar className="h-4 w-4" />;
    case "retirement":
      return <LogOut className="h-4 w-4" />;
    case "hall_of_fame":
      return <Award className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

export function getPriorityColor(priority: InboxPriority): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500/10 border-red-500 text-red-500";
    case "action":
      return "bg-gold/10 border-gold text-gold";
    default:
      return "bg-blue-500/10 border-blue-500 text-blue-500";
  }
}

export function useInbox() {
  const day = useGame((s: StoreType) => s.day);
  const inbox = useGame((s: StoreType) => s.inbox) || [];
  const markRead = useGame((s: StoreType) => s.markMessageRead);
  const markAllRead = useGame((s: StoreType) => s.markAllMessagesRead);
  const dismiss = useGame((s: StoreType) => s.dismissMessage);
  const pinUntil = useGame((s: StoreType) => s.pinMessageUntil);

  const [filter, setFilter] = useState<"all" | "unread" | "action">("all");

  const filteredMessages = useMemo(
    () =>
      inbox
        .filter((m) => {
          if (filter === "unread") return !m.readAt;
          if (filter === "action") return m.priority !== "info";
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
    pinUntil,
    getCategoryIcon,
    getPriorityColor,
  };
}
