import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  PolarRadiusAxis,
} from "recharts";
import type { Horse } from "@/game/types";

interface HorseStatsRadarProps {
  horse: Horse;
}

export function HorseStatsRadar({ horse }: HorseStatsRadarProps) {
  const data = [
    { stat: "SPEED", value: horse.stats.speed },
    { stat: "STAMINA", value: horse.stats.stamina },
    { stat: "ACCEL", value: horse.stats.acceleration },
    { stat: "CONSIST", value: horse.stats.consistency },
  ];

  return (
    <div className="h-[250px] w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(212,175,55,0.2)" gridType="polygon" radialLines={true} />
          <PolarAngleAxis
            dataKey="stat"
            tick={{
              fill: "rgba(245,245,220,0.6)",
              fontSize: 10,
              fontFamily: "monospace",
              fontWeight: "bold",
              letterSpacing: "0.1em",
            }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Stat Profile"
            dataKey="value"
            stroke="var(--gold)" // Gold
            strokeWidth={2}
            fill="var(--gold)"
            fillOpacity={0.3}
            animationDuration={1000}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Decorative center point */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
    </div>
  );
}
