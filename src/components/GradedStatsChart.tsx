import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface GradedStatsChartProps {
  data: {
    grade: string;
    runs: number;
    wins: number;
    places: number;
  }[];
}

export function GradedStatsChart({ data }: GradedStatsChartProps) {
  const chartConfig = {
    runs: {
      label: "Runs",
      color: "var(--muted)",
    },
    wins: {
      label: "Wins",
      color: "var(--primary)",
    },
    places: {
      label: "Places",
      color: "var(--secondary)",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="grade" tick={{ fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip content={<ChartTooltipContent />} />
          <Legend />
          <Bar dataKey="runs" fill="var(--muted)" name="Runs" radius={[4, 4, 0, 0]} />
          <Bar dataKey="wins" fill="var(--primary)" name="Wins" radius={[4, 4, 0, 0]} />
          <Bar dataKey="places" fill="var(--secondary)" name="Places" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
