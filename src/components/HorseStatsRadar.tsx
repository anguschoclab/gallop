import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { Horse } from "@/game/types";

interface HorseStatsRadarProps {
  horse: Horse;
}

export function HorseStatsRadar({ horse }: HorseStatsRadarProps) {
  const data = [
    { stat: "Speed", value: horse.stats.speed, max: 100 },
    { stat: "Stamina", value: horse.stats.stamina, max: 100 },
    { stat: "Acceleration", value: horse.stats.acceleration, max: 100 },
    { stat: "Consistency", value: horse.stats.consistency, max: 100 },
  ];

  const chartConfig = {
    value: {
      label: "Stat Value",
      color: "hsl(var(--primary))",
    },
    potential: {
      label: "Potential",
      color: "hsl(var(--secondary))",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="aspect-square max-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="stat"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            tickCount={5}
          />
          <Radar
            name="Current Stats"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="var(--primary)"
            fillOpacity={0.3}
          />
          <Radar
            name="Potential"
            dataKey="max"
            stroke="var(--secondary)"
            strokeWidth={1}
            fill="var(--secondary)"
            fillOpacity={0.1}
            strokeDasharray="4 4"
          />
          <ChartTooltip content={<ChartTooltipContent />} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
