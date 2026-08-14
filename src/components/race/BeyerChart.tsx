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
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { BEYER_CHART_HISTORY_LIMIT } from "@/constants";

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
        <p className="text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
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
          <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
            Avg Beyer
          </div>
          <div className="text-sm font-mono font-bold text-cream tabular-nums">{avg}</div>
        </div>
        <div className="space-y-0.5 border-l border-white/5 pl-6">
          <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
            Best Beyer
          </div>
          <div className="text-sm font-mono font-bold text-fame tabular-nums">{best}</div>
        </div>
        <div className="space-y-0.5 border-l border-white/5 pl-6">
          <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest">
            Last Run
          </div>
          <div className="text-sm font-mono font-bold text-gold tabular-nums">
            {data[data.length - 1].beyer}
          </div>
        </div>
      </div>

      <div className="h-56 w-full bg-black/40 border border-white/5 p-4 relative">
        {/* Corner brackets for industrial feel */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/40" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/40" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/40" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/40" />

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `D${v}`}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 9, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <ReferenceLine y={avg} stroke="rgba(245,245,220,0.2)" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{
                background: "#020617", // slate-950
                border: "1px solid rgba(212,175,55,0.3)", // gold/30
                borderRadius: 0,
                padding: "8px 12px",
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
              }}
              itemStyle={{ fontFamily: "monospace", fontSize: 12, fontWeight: "bold" }}
              labelStyle={{
                fontFamily: "monospace",
                fontSize: 9,
                color: "rgba(245,245,220,0.6)",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
              formatter={(v: number) => [<span className="text-gold">{v} BEYER</span>, "Velocity"]}
              labelFormatter={(_, p) => {
                const d = p?.[0]?.payload as (typeof data)[0] | undefined;
                return d ? `${d.raceName} | Day ${d.day} | Pos. ${d.position}` : "No data";
              }}
            />
            <Line
              type="step"
              dataKey="beyer"
              stroke="#d4af37" // Gold
              strokeWidth={2}
              dot={{ r: 3, fill: "#020617", stroke: "#d4af37", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "#d4af37", stroke: "#fff", strokeWidth: 1 }}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
