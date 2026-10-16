import { useEffect, useRef } from "react";
import { useGame, type StoreType } from "@/game/store";

/**
 * Auto-resume a batch advance after the interrupting player race is resolved.
 *
 * When the engine interrupts a range at a player-race boundary it commits the
 * days already simulated and leaves the execution machine in `interrupted`
 * with `interruptRaceId` + `remainingDays`. Once the race prompt is dismissed
 * (the race id clears) while days remain, this hook resumes the range exactly
 * once and clears the counter so the resume cannot re-fire.
 */
export function useAutoResumeAdvance(): void {
  const execution = useGame((s: StoreType) => s.execution);
  const advanceMultipleDays = useGame((s: StoreType) => s.advanceMultipleDays);
  const resumingRef = useRef(false);

  useEffect(() => {
    const running = execution?.status === "running" || execution?.status === "cancelling";
    const remaining = execution?.remainingDays;
    if (
      !execution?.interruptRaceId &&
      remaining !== undefined &&
      remaining > 0 &&
      !running &&
      !resumingRef.current
    ) {
      resumingRef.current = true;
      useGame.setState({
        execution: { ...execution, remainingDays: undefined } as typeof execution,
      });
      advanceMultipleDays(remaining).finally(() => {
        resumingRef.current = false;
      });
    }
  }, [execution, advanceMultipleDays]);
}
