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

type Entry = { raceName: string; day: number; beyer?: number; position: number };

export function BeyerChart({ history }: { history: Entry[] }) {
  const data = [...history]
    .filter((h) => typeof h.beyer === "number")
    .slice(0, 10)
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
      <p className="text-sm text-muted-foreground">
        No completed races yet. Beyer figures appear here after each finish.
      </p>
    );
  }

  const avg = Math.round(data.reduce((s, d) => s + d.beyer, 0) / data.length);
  const best = Math.max(...data.map((d) => d.beyer));
  const min = Math.max(0, Math.min(...data.map((d) => d.beyer)) - 8);
  const max = Math.min(125, Math.max(...data.map((d) => d.beyer)) + 8);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm">
        <div><span className="text-muted-foreground">Avg</span> <span className="font-semibold">{avg}</span></div>
        <div><span className="text-muted-foreground">Best</span> <span className="font-semibold">{best}</span></div>
        <div><span className="text-muted-foreground">Last</span> <span className="font-semibold">{data[data.length - 1].beyer}</span></div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              label={{ value: "Day", position: "insideBottom", offset: -2, fontSize: 11 }}
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={32}
            />
            <ReferenceLine y={avg} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(v: number) => [v, "Beyer"]}
              labelFormatter={(_, p) => {
                const d = p?.[0]?.payload as typeof data[0] | undefined;
                return d ? `${d.raceName} (D${d.day}, ${d.position}${getOrdinalSuffix(d.position)})` : "";
              }}
            />
            <Line
              type="monotone"
              dataKey="beyer"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
