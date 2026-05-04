import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface BreedingRadarChartProps {
  data: {
    factor: string;
    score: number;
    fullMark: number;
  }[];
}

export function BreedingRadarChart({ data }: BreedingRadarChartProps) {
  const chartConfig = {
    score: {
      label: "Compatibility Score",
      color: "var(--primary)",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="aspect-square max-h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey="factor"
            tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
            tickCount={5}
          />
          <Radar
            name="Compatibility"
            dataKey="score"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="var(--primary)"
            fillOpacity={0.3}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
