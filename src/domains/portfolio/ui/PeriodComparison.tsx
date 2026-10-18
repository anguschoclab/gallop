import { useMemo, useState } from "react";
import { useGame } from "@/platform/game/store";
import type { PlayerRaceWinRecord, PeriodRace } from "@/domains/stable/application/stableFacade";
import type { TrackLedgerEntry } from "@/domains/history/application/historyFacade";
import type { Transaction } from "@/domains/transactions/model/transactionTypes";
import type { Horse } from "@/domains/horse/application/horseFacade";
import { periodRaces, periodStats, pctChange, type DayRange } from "@/domains/stable/application/stableFacade";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import {
  filterPeriodCampaignRaces,
  type CampaignHistoryFilter,
} from "@/domains/stable/application/stableFacade";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import { Link } from "@tanstack/react-router";

const EMPTY: TrackLedgerEntry[] = [];
const EMPTY_TX: Transaction[] = [];
const EMPTY_HORSES: Horse[] = [];
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

function RangeInputs({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DayRange;
  onChange: (r: DayRange) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          aria-label={`${label} from day`}
          className="w-24"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: Number(e.target.value) || 0 })}
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="number"
          aria-label={`${label} to day`}
          className="w-24"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: Number(e.target.value) || 0 })}
        />
      </div>
    </div>
  );
}

function Change({ a, b, fmt = String }: { a: number; b: number; fmt?: (n: number) => string }) {
  const d = b - a;
  const p = pctChange(a, b);
  if (d === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={d > 0 ? "text-success" : "text-destructive"}>
      {d > 0 ? "+" : "−"}
      {fmt(Math.abs(d))}
      {p !== null && (
        <span className="opacity-70">
          {" "}
          ({p > 0 ? "+" : ""}
          {p.toFixed(0)}%)
        </span>
      )}
    </span>
  );
}

export function PeriodComparison({ wins }: { wins: PlayerRaceWinRecord[] }) {
  const day = useGame((s) => s.day);
  const ledger = useGame((s) => s.trackLedger ?? EMPTY);
  const horses = useGame((s) => s.horses);
  const archivedHorses = useGame((s) => s.archive?.horses ?? EMPTY_HORSES);
  const transactions = useGame((s) => s.transactions ?? EMPTY_TX);
  const goals = useGame((s) => s.stableGoals);
  const [campaignFilter, setCampaignFilter] = useState<CampaignHistoryFilter>("all");
  const [a, setA] = useState<DayRange>({ from: Math.max(0, day - 60), to: Math.max(0, day - 31) });
  const [b, setB] = useState<DayRange>({ from: Math.max(0, day - 30), to: day });

  const preset = (len: number) => {
    setB({ from: Math.max(0, day - len + 1), to: day });
    setA({ from: Math.max(0, day - 2 * len + 1), to: Math.max(0, day - len) });
  };

  const allHorses = useMemo(
    () => [...Object.values(horses), ...archivedHorses],
    [horses, archivedHorses],
  );
  const racesA = useMemo(
    () => filterPeriodCampaignRaces(periodRaces(allHorses, a, transactions), campaignFilter, goals),
    [allHorses, a, transactions, campaignFilter, goals],
  );
  const racesB = useMemo(
    () => filterPeriodCampaignRaces(periodRaces(allHorses, b, transactions), campaignFilter, goals),
    [allHorses, b, transactions, campaignFilter, goals],
  );
  const sa = useMemo(
    () => periodStats(wins, ledger, a, campaignFilter === "all" ? undefined : racesA),
    [wins, ledger, a, campaignFilter, racesA],
  );
  const sb = useMemo(
    () => periodStats(wins, ledger, b, campaignFilter === "all" ? undefined : racesB),
    [wins, ledger, b, campaignFilter, racesB],
  );
  const classes = Array.from(
    new Set([...Object.keys(sa.byClass), ...Object.keys(sb.byClass)]),
  ).sort();

  const rows: { label: string; a: number; b: number; fmt?: (n: number) => string }[] = [
    { label: "Wins", a: sa.wins, b: sb.wins },
    { label: "Earnings", a: sa.earnings, b: sb.earnings, fmt: money },
    { label: "Graded wins", a: sa.gradedWins, b: sb.gradedWins },
    { label: "Starts", a: sa.starts, b: sb.starts },
    { label: "Prestige", a: sa.prestige, b: sb.prestige, fmt: (n) => n.toFixed(1) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Choose two periods</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-6">
          <RangeInputs label="Period A" value={a} onChange={setA} />
          <RangeInputs label="Period B" value={b} onChange={setB} />
          <div className="space-y-1">
            <Label htmlFor="period-campaign-filter">Campaign history</Label>
            <Select
              value={campaignFilter}
              onValueChange={(value) => {
                if (value === "all" || value === "campaign" || value === "goal-wins")
                  setCampaignFilter(value);
              }}
            >
              <SelectTrigger id="period-campaign-filter" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All races</SelectItem>
                <SelectItem value="campaign">Since campaign start</SelectItem>
                <SelectItem value="goal-wins">Campaign class-goal wins</SelectItem>
              </SelectContent>
            </Select>
            {campaignFilter !== "all" && !goals && (
              <p className="text-xs text-muted-foreground">No saved campaign.</p>
            )}
            {campaignFilter !== "all" && goals && (
              <p className="text-xs text-muted-foreground">Campaign starts day {goals.startDay}</p>
            )}
          </div>
          <div className="flex gap-2">
            {[30, 90, 365].map((n) => (
              <Button key={n} size="sm" variant="outline" onClick={() => preset(n)}>
                Last {n}d vs prior
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Today is day {day}.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm font-mono">
            <thead className="text-xs text-muted-foreground uppercase">
              <tr>
                <th className="text-left py-1">Metric</th>
                <th className="text-right">Period A</th>
                <th className="text-right">Period B</th>
                <th className="text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const f = r.fmt ?? String;
                return (
                  <tr key={r.label} className="border-t border-border">
                    <td className="py-1.5">{r.label}</td>
                    <td className="text-right">{f(r.a)}</td>
                    <td className="text-right">{f(r.b)}</td>
                    <td className="text-right">
                      <Change a={r.a} b={r.b} fmt={r.fmt} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Results by race class</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No races in either period.</p>
          ) : (
            <table className="w-full text-sm font-mono">
              <thead className="text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="text-left py-1">Class</th>
                  <th className="text-right">A starts / wins</th>
                  <th className="text-right">B starts / wins</th>
                  <th className="text-right">Wins change</th>
                  <th className="text-right">Prestige A → B</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((k) => {
                  const ca = sa.byClass[k] ?? { starts: 0, wins: 0, prestige: 0 };
                  const cb = sb.byClass[k] ?? { starts: 0, wins: 0, prestige: 0 };
                  return (
                    <tr key={k} className="border-t border-border">
                      <td className="py-1.5">{k}</td>
                      <td className="text-right">
                        {ca.starts} / {ca.wins}
                      </td>
                      <td className="text-right">
                        {cb.starts} / {cb.wins}
                      </td>
                      <td className="text-right">
                        <Change a={ca.wins} b={cb.wins} />
                      </td>
                      <td className={cn("text-right")}>
                        {ca.prestige.toFixed(1)} → {cb.prestige.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Starts and prestige come from the course history records; wins and earnings from your
            race wins.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Races</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                ["Period A", racesA],
                ["Period B", racesB],
              ] as [string, PeriodRace[]][]
            ).map(([label, races]) => (
              <div key={label}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground pb-1">
                  {label}
                </p>
                {races.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No starts in this period.</p>
                ) : (
                  <table className="w-full text-sm font-mono">
                    <thead className="text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="text-left py-1">Day</th>
                        <th className="text-left">Horse</th>
                        <th className="text-left">Race</th>
                        <th className="text-right">Fin</th>
                        <th className="text-right">Prize</th>
                      </tr>
                    </thead>
                    <tbody>
                      {races.map((r) => (
                        <tr key={`${r.raceId}-${r.horseId}`} className="border-t border-border">
                          <td className="py-1 pr-2 text-muted-foreground">{r.day}</td>
                          <td className="pr-2 truncate max-w-[8rem]">{r.horseName}</td>
                          <td className="pr-2 max-w-[10rem] break-words">
                            <Link
                              to="/race/$raceId"
                              params={{ raceId: r.raceId }}
                              className="text-primary hover:underline"
                            >
                              {r.raceName}
                            </Link>
                            {r.grade && (
                              <span className="ml-1 text-[10px] text-gold">{r.grade}</span>
                            )}
                          </td>
                          <td className="text-right">{r.position}</td>
                          <td className="text-right">{r.prize > 0 ? money(r.prize) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Every stable start in the period, sorted by prize. Prize total differs from the Earnings
            metric above, which counts wins only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
