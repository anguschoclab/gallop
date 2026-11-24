import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useGameWithShallow } from "@/platform/game/store";
import { formatCurrency } from "@/shared/common/formatting";
import {
  buildRaceResults,
  summarizeRaceResults,
} from "@/domains/race/simulation/raceResultsLedger";
import type { Horse } from "@/domains/horse/simulation/types";

const TITLE = "Race Results — Finishes, Prize Money & Prestige";
const DESC =
  "Every start by your horses: finishing position, prize money, entry and jockey fees, and how each race moved your stable's cash and prestige.";

export const Route = createFileRoute("/raceResults")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RaceResultsPage,
});

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}

function Signed({ value, money }: { value: number; money?: boolean }) {
  if (value === 0) return <span className="text-muted-foreground">—</span>;
  const cls = value > 0 ? "text-success" : "text-destructive";
  const text = money ? formatCurrency(Math.abs(value)) : Math.abs(value).toFixed(0);
  return (
    <span className={cls}>
      {value > 0 ? "+" : "−"}
      {text}
    </span>
  );
}

function RaceResultsPage() {
  const { horses, transactions, events } = useGameWithShallow((s) => ({
    horses: s.horses,
    transactions: s.transactions,
    events: s.reputation?.events,
  }));
  const [horseFilter, setHorseFilter] = useState("all");

  const all = useMemo(
    () =>
      buildRaceResults({
        horses: Object.values(horses) as Horse[],
        transactions: transactions ?? [],
        reputationEvents: events ?? [],
      }),
    [horses, transactions, events],
  );
  const horseOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of all) m.set(r.horseId, r.horseName);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [all]);
  const rows = horseFilter === "all" ? all : all.filter((r) => r.horseId === horseFilter);
  const sum = summarizeRaceResults(rows);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-2xl">
          <Trophy className="h-5 w-5 text-primary" /> Race Results
        </h1>
        <p className="text-sm text-muted-foreground">
          Each start by your horses, with prize money, entry and jockey fees, and the change to your
          cash and prestige.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          ["Starts", `${sum.starts}`],
          ["Wins / places", `${sum.wins} / ${sum.places}`],
          ["Prize money", formatCurrency(sum.prize)],
          ["Jockey fees", formatCurrency(sum.jockeyFees)],
          [
            "Cash after fees",
            `${sum.cashNet < 0 ? "−" : ""}${formatCurrency(Math.abs(sum.cashNet))}`,
          ],
          ["Prestige", `${sum.prestige > 0 ? "+" : ""}${sum.prestige.toFixed(0)}`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="font-mono text-lg">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-sm uppercase tracking-wide">All starts</CardTitle>
          <Select value={horseFilter} onValueChange={setHorseFilter}>
            <SelectTrigger className="w-48" aria-label="Filter by horse">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All horses</SelectItem>
              {horseOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No races run yet. Enter a horse in a race and advance to race day to see its result
              here.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Day</th>
                  <th className="text-left">Horse</th>
                  <th className="text-left">Race</th>
                  <th className="text-right">Finish</th>
                  <th className="text-right">Prize</th>
                  <th className="text-right">Entry fee</th>
                  <th className="text-right">Jockey fee</th>
                  <th className="text-right">Cash</th>
                  <th className="text-right">Prestige</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-border">
                    <td className="py-2">{r.day}</td>
                    <td className="font-sans">
                      <Link
                        to="/stable/$horseId"
                        params={{ horseId: r.horseId }}
                        className="hover:text-primary hover:underline"
                      >
                        {r.horseName}
                      </Link>
                    </td>
                    <td className="font-sans">
                      {r.raceName}{" "}
                      {r.grade && (
                        <Badge variant="outline" className="ml-1">
                          {r.grade}
                        </Badge>
                      )}
                    </td>
                    <td className="text-right">
                      {r.position === 1 ? (
                        <span className="text-primary">1st</span>
                      ) : (
                        ordinal(r.position)
                      )}
                      {r.fieldSize ? (
                        <span className="text-muted-foreground"> / {r.fieldSize}</span>
                      ) : null}
                    </td>
                    <td className="text-right">{r.prize ? formatCurrency(r.prize) : "—"}</td>
                    <td className="text-right text-muted-foreground">
                      {r.entryFee ? formatCurrency(r.entryFee) : "—"}
                    </td>
                    <td className="text-right text-muted-foreground">
                      {r.jockeyFee ? formatCurrency(r.jockeyFee) : "—"}
                    </td>
                    <td className="text-right">
                      <Signed value={r.cashNet} money />
                    </td>
                    <td className="text-right">
                      <Signed value={r.prestige} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
