import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/cn";
import type { Horse } from "@/platform/game/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

interface RunnerStat {
  name: string;
  isPlayer: boolean;
  position: number;
  time: number;
}

interface PrivateTrialResultsProps {
  runnerStats: RunnerStat[];
  chartData: Record<string, number>[];
  feedback: string;
  horse: Horse;
  opponentName: string;
  onReset: () => void;
}

export function PrivateTrialResults({
  runnerStats,
  chartData,
  feedback,
  horse,
  opponentName,
  onReset,
}: PrivateTrialResultsProps) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-2 gap-4">
        {runnerStats.map((stat, idx) => (
          <div
            key={idx}
            className={cn(
              "p-4 border",
              stat.isPlayer ? "border-primary/30 bg-primary/5" : "border-white/5 bg-black/20",
            )}
          >
            <div className="text-[10px] font-black uppercase tracking-wide text-foreground/40 leading-none mb-1">
              Finish Position: {stat.position}
            </div>
            <div className="text-sm font-black uppercase text-foreground truncate">{stat.name}</div>
            <div className="text-lg font-mono font-black text-primary mt-2">
              {stat.time.toFixed(2)}s
            </div>
          </div>
        ))}
      </div>

      {/* Velocity Trajectory Chart */}
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-wider text-foreground/60">
          Velocity Profile (km/h)
        </Label>
        <div className="h-56 w-full bg-black/40 border border-white/5 p-4 relative">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/40" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary/40" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary/40" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/40" />

          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--chart-axis)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}s`}
              />
              <YAxis
                tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--chart-axis)" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <ChartTooltip
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  borderRadius: 0,
                  padding: "8px 12px",
                  boxShadow: "0 0 20px color-mix(in oklab, black 50%, transparent)",
                }}
                itemStyle={{ fontFamily: "monospace", fontSize: 11, fontWeight: "bold" }}
                labelStyle={{
                  fontFamily: "monospace",
                  fontSize: 9,
                  color: "var(--muted-foreground)",
                  marginBottom: 4,
                }}
              />
              <Line
                type="monotone"
                dataKey={horse.name}
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={opponentName}
                stroke="var(--info)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rider feedback */}
      <div className="bg-black/20 border border-white/5 p-4 rounded-none">
        <div className="text-[10px] font-black uppercase tracking-wide text-primary mb-2">
          Rider Feedback
        </div>
        <p className="text-xs font-mono text-foreground/90">{feedback}</p>
      </div>

      <Button
        onClick={onReset}
        className="w-full bg-primary hover:bg-accent-bright text-slate-950 font-black uppercase tracking-wide text-xs h-10 rounded-none shadow-lg"
      >
        Configure New Trial
      </Button>
    </div>
  );
}
