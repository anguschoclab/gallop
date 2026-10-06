import { useGame } from "@/game/store";
import type { HorseDailySnapshot } from "@/services/horse/horseFacade";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { CalendarClock } from "lucide-react";

const EMPTY: HorseDailySnapshot[] = [];

type Key = Exclude<keyof HorseDailySnapshot, "day">;
const ROWS: { key: Key; label: string; money?: boolean }[] = [
  { key: "ovr", label: "OVR" },
  { key: "speed", label: "Speed" },
  { key: "stamina", label: "Stamina" },
  { key: "acceleration", label: "Accel" },
  { key: "consistency", label: "Consistency" },
  { key: "form", label: "Form" },
  { key: "energy", label: "Energy" },
  { key: "price", label: "Price", money: true },
];

const fmt = (v: number, money?: boolean) =>
  money ? `$${Math.round(v).toLocaleString()}` : Number.isInteger(v) ? String(v) : v.toFixed(1);

function Delta({ d, money }: { d: number; money?: boolean }) {
  if (Math.abs(d) < 0.05) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={d > 0 ? "text-success" : "text-destructive"}>
      {d > 0 ? "+" : "−"}
      {fmt(Math.abs(d), money)}
    </span>
  );
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${20 - ((v - min) / span) * 18 - 1}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 20" className="h-5 w-24" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="text-gold"
      />
    </svg>
  );
}

export function HorseDailyProgress({ horseId }: { horseId: string }) {
  const snaps = useGame((s) => s.horseDailyProgress?.[horseId] ?? EMPTY);
  const last = snaps[snaps.length - 1];
  const prev = snaps[snaps.length - 2];
  const first = snaps[0];
  const recent = snaps.slice(-7).reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wide">
          <CalendarClock className="h-4 w-4 text-gold" /> Daily Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!last ? (
          <p className="text-sm text-muted-foreground">
            Advance a day to start tracking how this horse's stats, form and price change.
          </p>
        ) : (
          <div className="space-y-5">
            <table className="w-full text-xs font-mono">
              <thead className="text-muted-foreground uppercase">
                <tr>
                  <th className="text-left py-1">Metric</th>
                  <th className="text-right">Today</th>
                  <th className="text-right">vs yesterday</th>
                  <th className="text-right">Since day {first.day}</th>
                  <th className="text-right pl-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.key} className="border-t border-border">
                    <td className="py-1.5">{r.label}</td>
                    <td className="text-right">{fmt(last[r.key], r.money)}</td>
                    <td className="text-right">
                      {prev ? <Delta d={last[r.key] - prev[r.key]} money={r.money} /> : "—"}
                    </td>
                    <td className="text-right">
                      <Delta d={last[r.key] - first[r.key]} money={r.money} />
                    </td>
                    <td className="pl-3 flex justify-end">
                      <Spark values={snaps.map((s) => s[r.key])} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Last {recent.length} days
              </div>
              <table className="w-full text-xs font-mono">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left">Day</th>
                    <th className="text-right">OVR</th>
                    <th className="text-right">Form</th>
                    <th className="text-right">Energy</th>
                    <th className="text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s, i) => {
                    const before = recent[i + 1];
                    return (
                      <tr key={s.day} className="border-t border-border">
                        <td className="py-1">Day {s.day}</td>
                        <td className="text-right">{fmt(s.ovr)}</td>
                        <td className="text-right">{fmt(s.form)}</td>
                        <td className="text-right">{s.energy}%</td>
                        <td
                          className={cn(
                            "text-right",
                            before && s.price > before.price && "text-success",
                            before && s.price < before.price && "text-destructive",
                          )}
                        >
                          {fmt(s.price, true)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
