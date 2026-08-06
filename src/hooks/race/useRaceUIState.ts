import { useState, useEffect, useRef, useMemo } from "react";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { Race } from "@/core/race/types";
import { projectedBeyer } from "@/components/race/raceVisualHelpers";

export function useRaceUIState(
  runners: Runner[],
  race: Race,
  messageQueue: React.MutableRefObject<CommentaryLine[]>,
  finished: boolean,
  classBonus: number,
  calibratedPars: Record<number, number>,
) {
  const [sortBy, setSortBy] = useState<"position" | "beyer" | "velocity">("position");
  const [filter, setFilter] = useState<"all" | "owned" | "top5">("all");
  const [minBeyer, setMinBeyer] = useState(0);

  const ownedRunnersTotal = runners.filter((r) => r.owned);
  const defaultFollowTarget = ownedRunnersTotal.length > 0 ? ownedRunnersTotal[0].horseId : null;
  const [followTarget, setFollowTarget] = useState<string | null>(defaultFollowTarget);

  const [announcement, setAnnouncement] = useState<string>("");
  const [commentary, setCommentary] = useState<CommentaryLine[]>([]);
  const [subjectHorseId, setSubjectHorseId] = useState<string | null>(null);
  const [hideUntilAllFinished, setHideUntilAllFinished] = useState(false);
  const [showAllCards, setShowAllCards] = useState(false);

  const lastMessageTime = useRef<number>(0);

  // Paced message delivery effect
  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (messageQueue.current.length > 0 && now - lastMessageTime.current > 1500) {
        const next = messageQueue.current.shift()!;
        setCommentary((prev) => [...prev, next].slice(-50));
        setAnnouncement(next.text);
        setSubjectHorseId(next.horseId || null);
        lastMessageTime.current = now;

        // Clear subject highlight after a few seconds
        setTimeout(() => {
          setSubjectHorseId((current) => (current === next.horseId ? null : current));
        }, 3000);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [finished, messageQueue]);

  const allFinished = runners.every((r) => r.finishTime !== null);
  const anyFinished = runners.some((r) => r.finishTime !== null);

  const rows = runners.map((r) => ({
    r,
    beyer: projectedBeyer(r, race?.distance ?? 0, 0, classBonus, calibratedPars),
  }));

  const positionRank = new Map(
    [...rows].sort((a, b) => b.r.position - a.r.position).map((row, i) => [row.r.horseId, i + 1]),
  );

  const filtered = rows.filter(({ r, beyer }) => {
    if (filter === "owned" && !r.owned) return false;
    if (filter === "top5" && (positionRank.get(r.horseId) ?? 99) > 5) return false;
    if (minBeyer > 0 && (beyer ?? 0) < minBeyer) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "beyer") return (b.beyer ?? -1) - (a.beyer ?? -1);
    if (sortBy === "velocity") return b.r.velocity - a.r.velocity;
    return b.r.position - a.r.position;
  });

  return {
    sortBy,
    setSortBy,
    filter,
    setFilter,
    minBeyer,
    setMinBeyer,
    followTarget,
    setFollowTarget,
    announcement,
    commentary,
    subjectHorseId,
    hideUntilAllFinished,
    setHideUntilAllFinished,
    showAllCards,
    setShowAllCards,
    allFinished,
    anyFinished,
    sorted,
    positionRank,
  };
}
