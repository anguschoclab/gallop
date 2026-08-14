import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Target, Zap, Gauge, Wind } from "lucide-react";
import { useGame } from "@/game/store";
import {
  type JockeyInstructions,
  getRidingStyleDescription,
  getEarlyPositionDescription,
  getMoveTimingDescription,
  formatAggressiveness,
  calculateStyleBonus,
  type RidingStyle,
  type EarlyPosition,
  type MoveTiming,
} from "@/core/tactics/tacticsTypes";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { toast } from "sonner";

interface TacticsAnalyzerProps {
  horseId: string;
  raceId: string;
}

export function TacticsAnalyzer({ horseId, raceId }: TacticsAnalyzerProps) {
  const horse = useGame((s) => s.horses[horseId]);
  const race = useGame((s) => s.races[raceId]);
  const setRaceTactics = useGame((s) => s.setRaceTactics);

  const [instructions, setInstructions] = useState<JockeyInstructions>({
    horseId,
    raceId,
    ridingStyle: "tactical",
    earlyPosition: "midpack",
    moveTiming: "mid",
    aggressiveness: 50,
  });
  const [saved, setSaved] = useState(false);

  if (!horse || !race) return null;

  const styleBonus = calculateStyleBonus(instructions, horse.stats.speed, horse.stats.stamina);

  const handleSave = () => {
    setRaceTactics(raceId, horseId, instructions);
    setSaved(true);
    toast.success("Tactics saved for this race entry.");
    setTimeout(() => setSaved(false), 2000);
  };

  const ridingStyles: {
    value: RidingStyle;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { value: "front_runner", label: "Front Runner", icon: Zap },
    { value: "stalker", label: "Stalker", icon: Wind },
    { value: "closer", label: "Closer", icon: Target },
    { value: "tactical", label: "Tactical", icon: Gauge },
  ];

  const earlyPositions: { value: EarlyPosition; label: string }[] = [
    { value: "lead", label: "Lead" },
    { value: "press", label: "Press" },
    { value: "midpack", label: "Midpack" },
    { value: "drop_back", label: "Drop Back" },
  ];

  const moveTimings: { value: MoveTiming; label: string }[] = [
    { value: "early", label: "Early" },
    { value: "mid", label: "Mid" },
    { value: "late", label: "Late" },
  ];

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-cyan-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-400" /> Race Tactics
          </CardTitle>
          <Badge className="bg-cyan-400/10 text-cyan-400 border-cyan-400/30">
            {styleBonus > 0 ? `+${styleBonus.toFixed(1)} Bonus` : "Neutral"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Riding Style */}
        <div className="space-y-2">
          <div className="text-[9px] font-black uppercase text-cream/40 tracking-widest">
            Riding Style
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ridingStyles.map((style) => {
              const Icon = style.icon;
              return (
                <button
                  key={style.value}
                  type="button"
                  aria-pressed={instructions.ridingStyle === style.value}
                  onClick={() => setInstructions({ ...instructions, ridingStyle: style.value })}
                  className={cn(
                    "p-2 border rounded-sm flex items-center gap-2 transition-all",
                    instructions.ridingStyle === style.value
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                      : "border-white/10 hover:border-white/20 text-cream/60",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span className="text-[10px] font-black uppercase">{style.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-cream/40 italic">
            {getRidingStyleDescription(instructions.ridingStyle)}
          </p>
        </div>

        {/* Early Position */}
        <div className="space-y-2">
          <div className="text-[9px] font-black uppercase text-cream/40 tracking-widest">
            Early Position
          </div>
          <div className="grid grid-cols-4 gap-1">
            {earlyPositions.map((pos) => (
              <button
                key={pos.value}
                type="button"
                aria-pressed={instructions.earlyPosition === pos.value}
                onClick={() => setInstructions({ ...instructions, earlyPosition: pos.value })}
                className={cn(
                  "p-1.5 border rounded-sm text-[9px] font-black uppercase transition-all",
                  instructions.earlyPosition === pos.value
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                    : "border-white/10 hover:border-white/20 text-cream/60",
                )}
              >
                {pos.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-cream/40 italic">
            {getEarlyPositionDescription(instructions.earlyPosition)}
          </p>
        </div>

        {/* Move Timing */}
        <div className="space-y-2">
          <div className="text-[9px] font-black uppercase text-cream/40 tracking-widest">
            Move Timing
          </div>
          <div className="grid grid-cols-3 gap-1">
            {moveTimings.map((timing) => (
              <button
                key={timing.value}
                type="button"
                aria-pressed={instructions.moveTiming === timing.value}
                onClick={() => setInstructions({ ...instructions, moveTiming: timing.value })}
                className={cn(
                  "p-1.5 border rounded-sm text-[9px] font-black uppercase transition-all",
                  instructions.moveTiming === timing.value
                    ? "border-cyan-400 bg-cyan-400/10 text-cyan-400"
                    : "border-white/10 hover:border-white/20 text-cream/60",
                )}
              >
                {timing.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-cream/40 italic">
            {getMoveTimingDescription(instructions.moveTiming)}
          </p>
        </div>

        {/* Aggressiveness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-black uppercase text-cream/40 tracking-widest">
              Aggressiveness
            </div>
            <span className="text-[10px] font-mono text-cyan-400">
              {formatAggressiveness(instructions.aggressiveness)}
            </span>
          </div>
          <Slider
            value={[instructions.aggressiveness]}
            onValueChange={([value]) => setInstructions({ ...instructions, aggressiveness: value })}
            min={0}
            max={100}
            step={5}
            className="py-2"
          />
          <div className="flex justify-between text-[8px] text-cream/30 font-mono">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>

        {/* Style Bonus Indicator */}
        {styleBonus > 0 && (
          <div className="bg-green-400/10 border border-green-400/30 p-2 rounded-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-green-400" />
              <span className="text-[9px] font-black text-green-400 uppercase">
                Style Match Bonus: +{styleBonus.toFixed(1)}
              </span>
            </div>
            <p className="text-[8px] text-green-400/70 mt-1">
              This riding style matches your horse's speed/stamina profile.
            </p>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black uppercase tracking-widest text-xs"
        >
          {saved ? "Saved!" : "Save Tactics"}
        </Button>
      </CardContent>
    </Card>
  );
}
