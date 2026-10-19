import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface GradedStatsChartProps {
  data: {
    grade: string;
    runs: number;
    wins: number;
    places: number;
  }[];
}

export function GradedStatsChart({ data }: GradedStatsChartProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className="text-[10px] font-black uppercase tracking-wide text-primary/20">
          Graded Race Record
        </div>
      </div>

      <div className="h-[250px] w-full bg-black/40 border border-white/5 p-4 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/40" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/40" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/40" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/40" />

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="grade"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--chart-axis)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--chart-axis)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "color-mix(in oklab, white 4%, transparent)" }}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--gold-muted)",
                borderRadius: 0,
                padding: "8px 12px",
                boxShadow: "0 0 20px color-mix(in oklab, black 50%, transparent)",
              }}
              itemStyle={{
                fontFamily: "monospace",
                fontSize: 11,
                fontWeight: "bold",
                padding: "2px 0",
              }}
              labelStyle={{
                fontFamily: "monospace",
                fontSize: 9,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                marginBottom: 6,
                borderBottom: "1px solid color-mix(in oklab, white 10%, transparent)",
                paddingBottom: 4,
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              iconSize={8}
              wrapperStyle={{
                fontSize: 9,
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                paddingBottom: 20,
              }}
            />
            <Bar
              dataKey="runs"
              fill="color-mix(in oklab, var(--foreground) 10%, transparent)"
              name="RUNS"
              radius={0}
              barSize={20}
            />
            <Bar dataKey="wins" fill="var(--gold)" name="WINS" radius={0} barSize={20} />
            <Bar
              dataKey="places"
              fill="color-mix(in oklab, var(--success) 60%, transparent)"
              name="PLACES"
              radius={0}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
