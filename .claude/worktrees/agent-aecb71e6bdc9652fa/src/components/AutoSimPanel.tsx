import { useState, useRef } from "react";
import { useGame } from "@/game/store";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { gameCalendarDate } from "@/core/calendar/dateFormatting";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AutoSimPanel({ open, onClose }: Props) {
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

  function stop() {
    stoppedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
  }

  async function run() {
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

      // If pendingPlayerRaceId was set, we paused — stop autosim
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

      // Collect notable log events
      const recentLog = useGame.getState().log.slice(0, batchSize * 3);
      const notable = recentLog.filter(
        (e) =>
          e.text.includes("Foal born") ||
          e.text.includes("hammer price") ||
          e.text.includes("recalibrated") ||
          (e.day >= startDay && e.day <= afterDay),
      );
      if (notable.length > 0) {
        setLog((l) => [...notable.map((e) => `Day ${e.day}: ${e.text}`), ...l].slice(0, 50));
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      stop();
      onClose();
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-80 flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>AutoSim</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="sim-days">Days to simulate</Label>
            <Input
              id="sim-days"
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(3650, Number(e.target.value))))}
              disabled={running}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="headless"
              checked={headless}
              onCheckedChange={(v) => setHeadless(!!v)}
              disabled={running}
            />
            <Label htmlFor="headless" className="cursor-pointer">
              Auto-resolve player races (headless)
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="use-worker"
              checked={useWorker}
              onCheckedChange={(v) => setUseWorker(!!v)}
              disabled={running}
            />
            <Label htmlFor="use-worker" className="cursor-pointer">
              Use Web Worker for pipeline execution
            </Label>
          </div>

          {running && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{gameCalendarDate(day)}</p>
            </div>
          )}

          {log.length > 0 && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Events
              </p>
              {log.map((entry, i) => (
                <p
                  key={i}
                  className="text-xs text-muted-foreground leading-relaxed border-b border-border/40 pb-1"
                >
                  {entry}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t">
          {running ? (
            <Button onClick={stop} variant="destructive" className="flex-1">
              Stop
            </Button>
          ) : (
            <Button onClick={run} className="flex-1">
              Run AutoSim
            </Button>
          )}
          <Button
            onClick={() => {
              stop();
              onClose();
            }}
            variant="ghost"
          >
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
