import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import type { Jockey } from "@/game/types";
import { Trophy, Calendar, Target } from "lucide-react";

interface JockeyStatsGridProps {
  jockey: Jockey;
}

export function JockeyStatsGrid({ jockey }: JockeyStatsGridProps) {
  const statsData = [
    { stat: "PACE", value: jockey.stats.pacing },
    { stat: "POS", value: jockey.stats.positioning },
    { stat: "VIGOR", value: jockey.stats.vigor },
    { stat: "GATE", value: jockey.stats.gateSkill },
    { stat: "TEMP", value: jockey.stats.temperament },
  ];

  const winRate = jockey.careerStarts > 0 ? (jockey.careerWins / jockey.careerStarts) * 100 : 0;

  return (
    <div className="grid grid-cols-[1fr_120px] gap-4 items-center">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          <div className="bg-black/20 p-2 border border-white/5">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-blue-400/40 mb-1">
              <span>Strike Rate</span>
              <span className="font-mono text-cream/80">{winRate.toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400/60" style={{ width: `${winRate}%` }} />
            </div>
          </div>
          <div className="bg-black/20 p-2 border border-white/5">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-blue-400/40 mb-1">
              <span>Experience</span>
              <span className="font-mono text-cream/80">{jockey.careerStarts} RUNS</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400/60 opacity-30"
                style={{ width: `${Math.min(100, jockey.careerStarts / 10)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-[120px] w-[120px] relative shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={statsData}>
            <PolarGrid stroke="rgba(96,165,250,0.1)" gridType="polygon" />
            <PolarAngleAxis
              dataKey="stat"
              tick={{
                fill: "rgba(245,245,220,0.4)",
                fontSize: 7,
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="SKILL_SPEC"
              dataKey="value"
              stroke="#60a5fa"
              strokeWidth={1.5}
              fill="#60a5fa"
              fillOpacity={0.2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
