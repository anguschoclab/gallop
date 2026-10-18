import { useMemo } from "react";
import { useGame } from "@/platform/game/store";
import type { InboxMessage } from "@/domains/inbox/model/inboxTypes";

export function useStandingsMessages(): InboxMessage[] {
  const inbox = useGame((s) => s.inbox);
  return useMemo(() => inbox.filter((m) => m.category === "standings" && !m.readAt), [inbox]);
}
