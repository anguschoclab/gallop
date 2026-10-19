import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { GraduationCap, RotateCcw } from "lucide-react";
import { useGame } from "@/platform/game/store";

export function TutorialSettingsCard() {
  const tutorial = useGame((s) => s.tutorial);
  const resetTutorial = useGame((s) => s.resetTutorial);

  const isCompleted = tutorial
    ? tutorial.completedBeats.length >= 5 || (!tutorial.tutorialActive && !tutorial.skipped)
    : false;

  return (
    <Card className="bg-slate-900/40 border-white/5">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-[0.15em] flex items-center gap-2 text-foreground">
          <GraduationCap className="h-4 w-4" />
          Tutorial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground font-[family-name=var(--font-body)]">
          The guided first-session coach walks new players through their first race. Replay it any
          time to review the basics.
        </p>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
          Status:{" "}
          {tutorial?.skipped
            ? "Skipped"
            : isCompleted
              ? "Completed"
              : tutorial?.tutorialActive
                ? `In progress (Step ${tutorial.completedBeats.length + 1} of 5)`
                : "Not started"}
        </div>
        <Button variant="outline" size="sm" onClick={resetTutorial} className="gap-2 w-full">
          <RotateCcw className="h-4 w-4" />
          Replay Tutorial
        </Button>
      </CardContent>
    </Card>
  );
}
