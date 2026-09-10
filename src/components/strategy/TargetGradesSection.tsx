import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GRADED_RACES } from "@/data/gradedRaces";
import type { CampaignGoalType, Horse, HorseCampaign } from "@/game/types";
import { Trophy, Target, Sparkles, Compass } from "lucide-react";
import { cn } from "@/lib/cn";

interface TargetGradesSectionProps {
  horse: Horse;
  campaign?: HorseCampaign;
  onSetGoal: (goal: CampaignGoalType, targetRaceKey?: string) => void;
  onGeneratePrepChain: (goal: CampaignGoalType, targetRaceKey?: string) => void;
}

const GOAL_OPTIONS: { value: CampaignGoalType; label: string; desc: string; badge: string }[] = [
  {
    value: "chase_g1",
    label: "Chase Grade 1",
    desc: "Target pinnacle classic & championship Grade 1 stakes for maximum prestige & breeding value.",
    badge: "G1 Elite",
  },
  {
    value: "chase_g2",
    label: "Chase Grade 2",
    desc: "Step up through high-tier graded stakes to build ranking & confidence.",
    badge: "G2 Premier",
  },
  {
    value: "chase_g3",
    label: "Chase Grade 3",
    desc: "Establish black-type status with entry-level graded stakes competition.",
    badge: "G3 Stakes",
  },
  {
    value: "chase_major_race",
    label: "Chase Marquee Race",
    desc: "Target a specific legendary marquee race and build dedicated prep trials.",
    badge: "Marquee",
  },
  {
    value: "maximize_earnings",
    label: "Maximize Earnings",
    desc: "Hunt richest available allowances and restricted stakes for optimal cash flow.",
    badge: "Purses",
  },
  {
    value: "develop_maiden",
    label: "Develop Maiden",
    desc: "Target maiden special weights to secure the horse's first career victory.",
    badge: "Development",
  },
  {
    value: "free_run",
    label: "Free Run (Custom)",
    desc: "Fully manual scheduling with no automated slot generation constraints.",
    badge: "Manual",
  },
];

export function TargetGradesSection({
  horse,
  campaign,
  onSetGoal,
  onGeneratePrepChain,
}: TargetGradesSectionProps) {
  const [selectedGoal, setSelectedGoal] = useState<CampaignGoalType>(
    campaign?.goalType ?? "chase_g1",
  );
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>(
    campaign?.targetRaceKey ?? "kentucky_derby",
  );

  const confirmedSurf = campaign?.confirmedAptitudes?.surfaceConfirmed ?? "Dirt";
  const confirmedBand = campaign?.confirmedAptitudes?.distanceBandConfirmed ?? "mile";

  const g1Wins = horse.raceHistory?.filter((r) => r.grade === "G1" && r.position === 1).length ?? 0;
  const g2Wins = horse.raceHistory?.filter((r) => r.grade === "G2" && r.position === 1).length ?? 0;
  const g3Wins = horse.raceHistory?.filter((r) => r.grade === "G3" && r.position === 1).length ?? 0;

  const handleApplyGoal = () => {
    onSetGoal(selectedGoal, selectedGoal === "chase_major_race" ? selectedTargetKey : undefined);
  };

  const handleGenerate = () => {
    onGeneratePrepChain(
      selectedGoal,
      selectedGoal === "chase_major_race" ? selectedTargetKey : undefined,
    );
  };

  return (
    <Card className="bg-slate-900/50 border-white/10 shadow-xl border-l-4 border-l-amber-400">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Target className="w-5 h-5 text-gold" />
            <CardTitle className="text-lg font-black tracking-wide text-cream font-[family-name:var(--font-display)]">
              Target Grade & Goal Objectives
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-amber-400/30 text-amber-400"
            >
              G1: {g1Wins}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-blue-400/30 text-blue-400"
            >
              G2: {g2Wins}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] font-mono border-cyan-400/30 text-cyan-400"
            >
              G3: {g3Wins}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Goal Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {GOAL_OPTIONS.map((g) => {
            const isSelected = selectedGoal === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setSelectedGoal(g.value)}
                className={cn(
                  "p-4 rounded-xl text-left border transition-all flex flex-col justify-between space-y-2 focus:outline-none focus:ring-1 focus:ring-gold",
                  isSelected
                    ? "bg-gold/10 border-gold shadow-md shadow-gold/5 text-cream"
                    : "bg-slate-950/40 border-white/5 hover:border-white/20 text-cream/70 hover:text-cream",
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-sm text-cream">{g.label}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] font-mono",
                      isSelected ? "border-gold text-gold" : "border-white/10 text-cream-muted",
                    )}
                  >
                    {g.badge}
                  </Badge>
                </div>
                <p className="text-[11px] text-cream-muted leading-relaxed line-clamp-2">
                  {g.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Marquee Target Selector (if Chase Major Race selected) */}
        {selectedGoal === "chase_major_race" && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-gold/30 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-gold font-mono text-xs font-bold uppercase">
              <Trophy className="w-4 h-4" /> Select Target Marquee Stakes
            </div>
            <Select value={selectedTargetKey} onValueChange={setSelectedTargetKey}>
              <SelectTrigger className="w-full bg-slate-900 border-white/10 text-cream font-medium">
                <SelectValue placeholder="Choose a marquee race..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-cream max-h-64">
                {GRADED_RACES.map((race) => (
                  <SelectItem
                    key={race.key}
                    value={race.key}
                    className="focus:bg-gold/20 focus:text-gold font-mono text-xs"
                  >
                    <span className="font-bold text-cream">{race.name}</span> ({race.grade} ·{" "}
                    {race.surface} · {race.distance}m · Day {race.dayOfYear})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Aptitude Compatibility Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cream-muted">
              <Compass className="w-4 h-4 text-gold/70" />
              <span>Confirmed Aptitude:</span>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono uppercase">
              {confirmedSurf}
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-mono uppercase">
              {confirmedBand} Band
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyGoal}
              className="border-white/10 hover:border-gold hover:text-gold text-xs font-mono uppercase"
            >
              Update Goal
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              className="bg-gold hover:bg-gold-bright text-slate-950 font-black text-xs uppercase gap-2 shadow-lg shadow-gold/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Generate Prep Chain
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
