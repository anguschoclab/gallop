import { useState, useRef, useCallback } from "react";
import { useGame } from "@/game/store";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";

export function useAutoSim() {
  const [days, setDays] = useState(30);
  const [headless, setHeadless] = useState(false);
  const [useWorker, setUseWorker] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const advanceMultipleDays = useGame((s) => s.advanceMultipleDays);
  const day = useGame((s) => s.day);
  const rafRef = useRef<number>(0);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
  }, []);

  const run = useCallback(async () => {
    if (days <= 0) return;
    stoppedRef.current = false;
    setRunning(true);
    setProgress(0);
    setLog([]);

    let done = 0;
    const total = days;
    const startDay = day;

    async function tick() {
      if (stoppedRef.current) return;
      if (done >= total) {
        setRunning(false);
        setLog((l) => [`AutoSim complete — ${total} days simulated.`, ...l]);
        return;
      }

      const batchSize = Math.min(5, total - done);
      const beforeDay = useGame.getState().day;
      await advanceMultipleDays(batchSize, headless);
      const afterDay = useGame.getState().day;

      if (useGame.getState().pendingPlayerRaceId) {
        setRunning(false);
        setLog((l) => [
          `Paused — player race detected on ${gameCalendarDate(afterDay + 1)}.`,
          ...l,
        ]);
        return;
      }

      done += afterDay - beforeDay;
      setProgress(Math.round((done / total) * 100));

      const recentLog = useGame.getState().log.slice(0, batchSize * 3);
      const notable = recentLog.filter(
        (e: any) =>
          e.text.includes("Foal born") ||
          e.text.includes("hammer price") ||
          e.text.includes("recalibrated") ||
          (e.day >= startDay && e.day <= afterDay),
      );
      if (notable.length > 0) {
        setLog((l) => [...notable.map((e: any) => `Day ${e.day}: ${e.text}`), ...l].slice(0, 50));
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [days, headless, advanceMultipleDays, day]);

  return {
    days,
    setDays,
    headless,
    setHeadless,
    useWorker,
    setUseWorker,
    running,
    progress,
    log,
    run,
    stop,
    day,
  };
}
