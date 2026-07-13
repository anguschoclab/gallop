import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/cn";

interface DistanceAptitudeDriftProps {
  horse: any;
}

interface DriftPoint {
  day: number;
  raceName: string;
  distance: number;
  aptitudeBefore: number;
  aptitudeAfter: number;
  delta: number;
}

export function DistanceAptitudeDrift({ horse }: DistanceAptitudeDriftProps) {
  const driftData = useMemo<DriftPoint[]>(() => {
    const history = [...(horse.raceHistory ?? [])]
      .filter((r: any) => typeof r.distance === "number" && typeof r.day === "number")
      .sort((a: any, b: any) => a.day - b.day);

    if (history.length === 0) return [];

    const currentApt = horse.distanceAptitude ?? 1600;
    const aptAfter: number[] = [];
    let apt = currentApt;

    for (let i = history.length - 1; i >= 0; i--) {
      aptAfter[i] = apt;
      const raceDistance = history[i].distance;
      const prevApt = apt - (raceDistance - apt) * 0.05;
      apt = Math.max(800, Math.min(3200, prevApt));
    }

    return history.map((r: any, i: number) => {
      const after = aptAfter[i];
      const before = i === 0 ? apt : aptAfter[i - 1];
      return {
        day: r.day,
        raceName: r.raceName ?? r.raceId ?? "—",
        distance: r.distance,
        aptitudeBefore: Math.round(before),
        aptitudeAfter: Math.round(after),
        delta: Math.round(after - before),
      };
    });
  }, [horse.raceHistory, horse.distanceAptitude]);

  if (driftData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 bg-black/20 border border-white/5">
        <p className="text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
          No aptitude drift data
        </p>
      </div>
    );
  }

  const chartData = driftData.map((d) => ({
    day: d.day,
    aptitude: d.aptitudeAfter,
    raceName: d.raceName,
  }));

  const minApt = Math.min(...chartData.map((d) => d.aptitude)) - 50;
  const maxApt = Math.max(...chartData.map((d) => d.aptitude)) + 50;

  return (
    <div className="space-y-3">
      <div className="h-40 w-full bg-black/40 border border-white/5 p-3 relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold/40" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gold/40" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gold/40" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold/40" />

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 6, right: 10, left: -18, bottom: 2 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 8, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `D${v}`}
            />
            <YAxis
              domain={[Math.max(700, minApt), Math.min(3300, maxApt)]}
              tick={{ fontSize: 8, fontFamily: "monospace", fill: "rgba(245,245,220,0.4)" }}
              axisLine={false}
              tickLine={false}
              width={42}
            />
            <Tooltip
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(212,175,55,0.3)",
                borderRadius: 0,
                padding: "6px 10px",
                boxShadow: "0 0 20px rgba(0,0,0,0.5)",
              }}
              itemStyle={{ fontFamily: "monospace", fontSize: 11, fontWeight: "bold" }}
              labelStyle={{
                fontFamily: "monospace",
                fontSize: 9,
                color: "rgba(245,245,220,0.6)",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
              formatter={(v: number) => [<span className="text-gold">{v}m</span>, "Aptitude"]}
              labelFormatter={(_, p) => {
                const d = p?.[0]?.payload as (typeof chartData)[0] | undefined;
                return d ? `${d.raceName} | Day ${d.day}` : "No data";
              }}
            />
            <Line
              type="step"
              dataKey="aptitude"
              stroke="#d4af37"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#020617", stroke: "#d4af37", strokeWidth: 2 }}
              activeDot={{ r: 4, fill: "#d4af37", stroke: "#fff", strokeWidth: 1 }}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="divide-y divide-white/5 max-h-32 overflow-y-auto custom-scrollbar">
        {driftData
          .slice()
          .reverse()
          .map((d, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 px-1 text-[9px] font-mono">
              <span className="text-cream/20 tabular-nums w-10">D{d.day}</span>
              <span className="text-cream/50 truncate flex-1">{d.raceName}</span>
              <span className="text-cream/30 tabular-nums w-12 text-right">{d.distance}m</span>
              <span
                className={cn(
                  "tabular-nums font-bold w-10 text-right",
                  d.delta > 0 ? "text-gold" : d.delta < 0 ? "text-cream/40" : "text-cream/20",
                )}
              >
                {d.delta > 0 ? "+" : ""}
                {d.delta}
              </span>
              <span className="text-cream/50 tabular-nums w-14 text-right">{d.aptitudeAfter}m</span>
            </div>
          ))}
      </div>
    </div>
  );
}
