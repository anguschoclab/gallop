import { useMemo } from "react";
import { useGame } from "@/game/store";
import type { InboxMessage } from "@/core/inbox/inboxTypes";

export function useStandingsMessages(): InboxMessage[] {
  const inbox = useGame((s) => s.inbox);
  return useMemo(() => inbox.filter((m) => m.category === "standings" && !m.readAt), [inbox]);
}
