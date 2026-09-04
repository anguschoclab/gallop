import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, X } from "lucide-react";
import { useGame } from "@/game/store";

export interface BeyerExplainerProps {
  beyerScore: number;
}

export function BeyerExplainer({ beyerScore }: BeyerExplainerProps) {
  const tutorial = useGame((s) => s.tutorial);
  const acknowledgeBeyerExplainer = useGame((s) => s.acknowledgeBeyerExplainer);
  const completeTutorialBeat = useGame((s) => s.completeTutorialBeat);

  if (!tutorial || !tutorial.tutorialActive || tutorial.beyerExplainerAcknowledged) {
    return null;
  }

  const handleDismiss = () => {
    acknowledgeBeyerExplainer();
    completeTutorialBeat(3);
  };

  return (
    <Card className="border-blue-400/30 bg-slate-900/40">
      <CardHeader className="bg-blue-400/5 border-b border-blue-400/10">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-blue-400">
          <GraduationCap size={16} />
          What is a Beyer Speed Figure?
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-cream font-[family-name=var(--font-body)]">
          The Beyer Speed Figure is a number that measures how fast your horse ran regardless of the
          track surface or conditions. Higher is better — a figure in the 90s is a solid
          performance, 100+ is exceptional.
        </p>
        <div className="flex items-center gap-3 p-3 bg-black/40 border border-blue-400/10">
          <span className="text-[10px] font-black uppercase text-blue-400/60 tracking-wide">
            Your horse's figure
          </span>
          <span className="text-3xl font-black tabular-nums text-blue-400 font-[family-name=var(--font-display)]">
            {beyerScore}
          </span>
        </div>
        <p className="text-xs text-cream-muted italic">
          Compare figures across races to see if your horse is improving. A rising figure means your
          horse is getting faster.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full px-4 py-2 text-sm font-bold uppercase tracking-wide bg-blue-400/10 border border-blue-400/30 text-blue-400 hover:bg-blue-400/20 transition-colors flex items-center justify-center gap-2"
        >
          <X className="h-4 w-4" />
          Got it
        </button>
      </CardContent>
    </Card>
  );
}
