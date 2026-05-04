import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface BreedingRadarChartProps {
  factors: {
    nicking: { score: number; description: string };
    dosage: { score: number; description: string };
    inbreeding: { score: number; description: string };
    parentPerformance: { score: number; description: string };
    conformation: { score: number; description: string };
    temperament: { score: number; description: string };
    foundationStock: { score: number; description: string };
    founderEffect: { score: number; description: string };
    genetic: { score: number; description: string };
    blueHen: { score: number; description: string };
  };
}

export function BreedingRadarChart({ factors }: BreedingRadarChartProps) {
  const data = [
    { factor: "Nicking", score: factors.nicking.score, fullMark: 1 },
    { factor: "Dosage", score: factors.dosage.score, fullMark: 1 },
    { factor: "Inbreeding", score: factors.inbreeding.score, fullMark: 1 },
    { factor: "Parent Perf", score: factors.parentPerformance.score, fullMark: 1 },
    { factor: "Conformation", score: factors.conformation.score, fullMark: 1 },
    { factor: "Temperament", score: factors.temperament.score, fullMark: 1 },
    { factor: "Foundation", score: factors.foundationStock.score, fullMark: 1 },
    { factor: "Founder Effect", score: factors.founderEffect.score, fullMark: 1 },
    { factor: "Genetic", score: factors.genetic.score, fullMark: 1 },
    { factor: "Blue Hen", score: factors.blueHen.score, fullMark: 1 },
  ];

  const chartConfig = {
    score: {
      label: "Score",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="aspect-square max-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="factor"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
            tickCount={5}
          />
          <Radar
            name="Compatibility Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
