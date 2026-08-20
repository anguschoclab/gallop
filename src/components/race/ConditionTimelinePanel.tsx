/**
 * ConditionTimelinePanel — memoized container that encapsulates the
 * useConditionTimeline hook and renders ConditionTimeline only when
 * relevant data exists. React.memo prevents re-renders triggered by
 * unrelated RaceBroadcast state changes (commentary, leaderboard, speed).
 */
import { memo, useMemo, type MutableRefObject } from "react";
import { MemoizedConditionTimeline } from "@/components/race/ConditionTimeline";
import { useConditionTimeline } from "@/hooks/race/useConditionTimeline";
import type { Runner } from "@/core/race/engine/runnerBuilder";

interface ConditionTimelinePanelProps {
  runners: Runner[];
  distance: number;
  horseId: string | null;
  tick: number;
  simTimeRef?: MutableRefObject<number>;
}

function ConditionTimelinePanelInner({
  runners,
  distance,
  horseId,
  tick,
  simTimeRef,
}: ConditionTimelinePanelProps) {
  const segments = useConditionTimeline(runners, distance, horseId, tick, simTimeRef);

  const horseName = useMemo(
    () => runners.find((r) => r.horseId === horseId)?.name,
    [runners, horseId],
  );

  // Wall-clock stamp of the most recent simulation tick that fed the strip.
  const lastUpdatedAt = useMemo(() => Date.now(), [tick, horseId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!horseId || segments.length === 0) return null;

  return (
    <MemoizedConditionTimeline
      segments={segments}
      distance={distance}
      horseName={horseName}
      lastUpdatedAt={lastUpdatedAt}
    />
  );
}

export const ConditionTimelinePanel = memo(ConditionTimelinePanelInner);
