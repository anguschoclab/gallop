/**
 * useConditionTimeline — samples the in-running conditions of one selected
 * runner every simulation tick and stitches them into timeline segments so the
 * UI can show when each condition badge turned on and off during the run.
 */
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import {
  buildFieldContext,
  deriveRunnerConditions,
  type ConditionTone,
  type RunnerConditionId,
} from "@/core/race/runnerConditions";

export interface ConditionSegment {
  id: RunnerConditionId;
  label: string;
  tone: ConditionTone;
  detail: string;
  /** Distance (m) at which the condition first appeared. */
  startPos: number;
  /** Distance (m) at which it was last seen. */
  endPos: number;
  /** Simulation time (s) at which the condition first appeared. */
  startTime: number;
  endTime: number;
  /** Still active on the latest sample. */
  active: boolean;
}

export function useConditionTimeline(
  runners: Runner[],
  distance: number,
  horseId: string | null | undefined,
  tick: number,
  simTimeRef?: MutableRefObject<number>,
) {
  const [segments, setSegments] = useState<ConditionSegment[]>([]);
  const peakRef = useRef(0);
  const allRef = useRef<ConditionSegment[]>([]);
  const openRef = useRef<Map<RunnerConditionId, ConditionSegment>>(new Map());
  const keyRef = useRef<string | null>(null);
  const lastPosRef = useRef(0);

  useEffect(() => {
    if (!horseId) {
      if (allRef.current.length) {
        allRef.current = [];
        openRef.current = new Map();
        setSegments([]);
      }
      return;
    }
    const runner = runners.find((r) => r.horseId === horseId);
    if (!runner) return;

    // Reset when the subject changes or the race restarts (positions rewound).
    if (keyRef.current !== horseId || runner.position < lastPosRef.current - 1) {
      keyRef.current = horseId;
      peakRef.current = 0;
      allRef.current = [];
      openRef.current = new Map();
    }
    lastPosRef.current = runner.position;
    if (runner.velocity > peakRef.current) peakRef.current = runner.velocity;

    const field = buildFieldContext(runners);
    const conditions = deriveRunnerConditions(
      runner,
      field,
      { peakVelocity: peakRef.current },
      distance,
    );
    const now = simTimeRef?.current ?? 0;
    const pos = Math.max(0, Math.min(distance, runner.position));
    const seen = new Set<RunnerConditionId>(conditions.map((c) => c.id));

    let changed = false;

    for (const c of conditions) {
      const open = openRef.current.get(c.id);
      if (open) {
        open.endPos = pos;
        open.endTime = now;
      } else {
        const seg: ConditionSegment = {
          id: c.id,
          label: c.label,
          tone: c.tone,
          detail: c.detail,
          startPos: pos,
          endPos: pos,
          startTime: now,
          endTime: now,
          active: true,
        };
        openRef.current.set(c.id, seg);
        allRef.current.push(seg);
        changed = true;
      }
    }

    for (const [id, seg] of [...openRef.current]) {
      if (!seen.has(id)) {
        seg.active = false;
        openRef.current.delete(id);
        changed = true;
      }
    }

    // Extending an open segment also matters visually, so publish either way.
    if (changed || openRef.current.size > 0) {
      setSegments(allRef.current.map((s) => ({ ...s })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, horseId, distance, runners]);

  return segments;
}
