import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { BEYER_CHART_HISTORY_LIMIT } from "@/shared/constants/dashboardConstants";

type Entry = { raceName: string; day: number; beyer?: number; position: number };

export function BeyerChart({ history }: { history: Entry[] }) {
  const data = [...history]
    .filter((h) => typeof h.beyer === "number")
    .slice(0, BEYER_CHART_HISTORY_LIMIT)
    .reverse()
    .map((h, i) => ({
      idx: i + 1,
      day: h.day,
      beyer: h.beyer!,
      raceName: h.raceName,
      position: h.position,
    }));

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-black/20 border border-white/5">
        <p className="text-[10px] font-mono text-foreground/20 uppercase tracking-wide">
          Zero Velocity Data Logged
        </p>
      </div>
    );
  }

  const avg = Math.round(data.reduce((s, d) => s + d.beyer, 0) / data.length);
  const best = Math.max(...data.map((d) => d.beyer));
  const min = Math.max(0, Math.min(...data.map((d) => d.beyer)) - 8);
  const max = Math.min(125, Math.max(...data.map((d) => d.beyer)) + 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6">
        <div className="space-y-0.5">
          <div className="text-[8px] font-black uppercase text-foreground/20 tracking-wide">
            Avg Beyer
          </div>
          <div className="text-sm font-mono font-bold text-foreground tabular-nums">{avg}</div>
        </div>
        <div className="space-y-0.5 border-l border-white/5 pl-6">
          <div className="text-[8px] font-black uppercase text-foreground/20 tracking-wide">
            Best Beyer
          </div>
          <div className="text-sm font-mono font-bold text-fame tabular-nums">{best}</div>
        </div>
        <div className="space-y-0.5 border-l border-white/5 pl-6">
          <div className="text-[8px] font-black uppercase text-foreground/20 tracking-wide">
            Last Run
          </div>
          <div className="text-sm font-mono font-bold text-primary tabular-nums">
            {data[data.length - 1].beyer}
          </div>
        </div>
      </div>

      <div className="h-56 w-full bg-black/40 border border-white/5 p-4 relative">
        {/* Corner brackets for industrial feel */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/40" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/40" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/40" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/40" />

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--chart-axis)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `D${v}`}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--chart-axis)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <ReferenceLine
              y={avg}
              stroke="color-mix(in oklab, var(--foreground) 20%, transparent)"
              strokeDasharray="3 3"
            />
            <Tooltip
              contentStyle={{
                background: "var(--background)", // slate-950
                border: "1px solid var(--gold-muted)", // gold/30
                borderRadius: 0,
                padding: "8px 12px",
                boxShadow: "0 0 20px color-mix(in oklab, black 50%, transparent)",
              }}
              itemStyle={{ fontFamily: "monospace", fontSize: 12, fontWeight: "bold" }}
              labelStyle={{
                fontFamily: "monospace",
                fontSize: 9,
                color: "var(--muted-foreground)",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
              formatter={(v: number) => [
                <span className="text-primary">{v} BEYER</span>,
                "Velocity",
              ]}
              labelFormatter={(_, p) => {
                const d = p?.[0]?.payload as (typeof data)[0] | undefined;
                return d ? `${d.raceName} | Day ${d.day} | Pos. ${d.position}` : "No data";
              }}
            />
            <Line
              type="step"
              dataKey="beyer"
              stroke="var(--gold)" // Gold
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--background)", stroke: "var(--gold)", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "var(--gold)", stroke: "var(--foreground)", strokeWidth: 1 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
