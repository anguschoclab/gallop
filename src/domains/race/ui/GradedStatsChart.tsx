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
        <div className="text-[10px] font-black uppercase tracking-wide text-gold-muted/60">
          Graded Race Record
        </div>
      </div>

      <div className="h-[250px] w-full bg-black/40 border border-white/5 p-4 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/40" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/40" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/40" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/40" />

        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="grade"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.02)" }}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: 0,
                padding: "8px 12px",
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
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
                color: "rgba(245,245,220,0.6)",
                textTransform: "uppercase",
                marginBottom: 6,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
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
            <Bar dataKey="runs" fill="rgba(245,245,220,0.1)" name="RUNS" radius={0} barSize={20} />
            <Bar dataKey="wins" fill="var(--gold)" name="WINS" radius={0} barSize={20} />
            <Bar
              dataKey="places"
              fill="rgba(34,197,94,0.6)"
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
