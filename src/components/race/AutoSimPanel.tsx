import { useAutoSim } from "@/hooks/race/useAutoSim";
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
  const {
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
  } = useAutoSim();

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
