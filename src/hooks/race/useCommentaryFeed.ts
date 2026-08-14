import { useState, useEffect, useRef } from "react";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";
import {
  COMMENTARY_DRAIN_INTERVAL_MS,
  COMMENTARY_PACING_MS,
  COMMENTARY_SLICE_CAP,
  SUBJECT_HIGHLIGHT_CLEAR_MS,
} from "@/constants/raceBroadcastConstants";

/**
 * useCommentaryFeed — drains a message queue at a paced interval and exposes
 * the current commentary feed, latest announcement, and subject-horse highlight.
 *
 * Extracted from useRaceUIState.ts to separate commentary pacing from
 * leaderboard derivation.
 */
export function useCommentaryFeed(
  messageQueue: React.MutableRefObject<CommentaryLine[]>,
  finished: boolean,
) {
  const [announcement, setAnnouncement] = useState<string>("");
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const [subjectHorseId, setSubjectHorseId] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(() => Date.now());
  const lastMessageTime = useRef<number>(0);


  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (messageQueue.current.length > 0 && now - lastMessageTime.current > COMMENTARY_PACING_MS) {
        const next = messageQueue.current.shift()!;
        setCommentary((prev) => [...prev, next].slice(-COMMENTARY_SLICE_CAP));
        setAnnouncement(next.text);
        setSubjectHorseId(next.horseId || null);
        setLastUpdatedAt(now);
        lastMessageTime.current = now;

        setTimeout(() => {
          setSubjectHorseId((current) => (current === next.horseId ? null : current));
        }, SUBJECT_HIGHLIGHT_CLEAR_MS);
      }
    }, COMMENTARY_DRAIN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [finished, messageQueue]);

  return {
    announcement,
    commentary,
    subjectHorseId,
    lastUpdatedAt,
  };

}
