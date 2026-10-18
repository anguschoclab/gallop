import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Sparkline } from "@/shared/ui/charts/Sparkline";
import { useGameWithShallow } from "@/platform/game/store";
import { formatCurrency } from "@/shared/common/formatting";
import type {
  RankingsHistory,
  RankingsSnapshot,
} from "@/domains/market/simulation/rankingsHistory";
import type { Horse } from "@/platform/game/types";
import { Button } from "@/shared/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/ui/select";
import {
  compareRankingsForDay,
  rankingsComparisonDays,
  type RankingsComparisonRow,
} from "@/domains/market/simulation/rankingsComparison";

const EMPTY_HISTORY: RankingsHistory = {};

export const Route = createFileRoute("/rankings-history")({
  head: () => ({
    meta: [
      { title: "Rankings History — Position, Reputation & Price Over Time" },
      {
        name: "description",
        content:
          "Track each ranked horse's world-rankings position, reputation and auction price day by day.",
      },
      {
        property: "og:title",
        content: "Rankings History — Position, Reputation & Price Over Time",
      },
      {
        property: "og:description",
        content:
          "Track each ranked horse's world-rankings position, reputation and auction price day by day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RankingsHistoryPage,
});

function delta(
  now: number | null,
  then: number | null | undefined,
): { text: string; up: boolean } | null {
  if (now === null || then == null || then === now) return null;
  const d = now - then;
  return { text: `${d > 0 ? "+" : ""}${d}`, up: d < 0 };
}

function RankingsHistoryPage() {
  const history = useGameWithShallow(
    (s) => (s.rankingsHistory as RankingsHistory | undefined) ?? EMPTY_HISTORY,
  );
  const horses = useGameWithShallow((s) => s.horses) as Record<string, Horse>;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const days = useMemo(() => rankingsComparisonDays(history), [history]);
  const [comparisonDay, setComparisonDay] = useState<number | null>(null);
  const activeDay = comparisonDay ?? days[0];
  const comparison = useMemo(
    () =>
      activeDay === undefined
        ? null
        : compareRankingsForDay(history, Object.values(horses), activeDay),
    [history, horses, activeDay],
  );

  const rows = useMemo(() => {
    return Object.entries(history)
      .map(([horseId, snaps]) => {
        const latest = snaps[snaps.length - 1];
        const prev = snaps.length > 1 ? snaps[snaps.length - 2] : undefined;
        return {
          horseId,
          name: horses[horseId]?.name ?? "Unknown horse",
          latest,
          prev,
          snaps,
        };
      })
      .filter((r) => r.latest)
      .sort((a, b) => (a.latest.rank ?? Infinity) - (b.latest.rank ?? Infinity));
  }, [history, horses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const selected = selectedId
    ? (rows.find((r) => r.horseId === selectedId) ?? null)
    : (rows[0] ?? null);

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-3xl font-black font-[family-name:var(--font-display)] text-cream">
            Rankings History
          </h1>
          <p className="text-sm text-cream-muted">
            Position, reputation and auction price over time — recorded daily
          </p>
        </div>
      </header>

      {comparison ? (
        <section className="space-y-4 border-b border-border pb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-cream">My horses vs daily leaders</h2>
              <p className="text-[10px] font-mono uppercase text-cream/40">
                Gaps compare with that day’s #1
              </p>
            </div>
            <Select
              value={String(activeDay)}
              onValueChange={(value) => setComparisonDay(Number(value))}
            >
              <SelectTrigger aria-label="Comparison day" className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {days.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    Day {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ComparisonTable title="Top-ranked horses" rows={comparison.leaders} />
          <ComparisonTable
            title="My horses"
            rows={comparison.players}
            empty="You have no horses to compare."
          />
        </section>
      ) : null}

      {rows.length === 0 ? (
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-6 text-center text-[11px] font-mono uppercase tracking-wide text-cream/40">
            No rankings recorded yet. Advance a day after races have been run and snapshots will
            appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="border-white/5 bg-slate-900/40">
            <CardContent className="space-y-2 p-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search horses…"
                aria-label="Search ranked horses"
                className="h-8 text-xs"
              />
              <div className="max-h-[560px] divide-y divide-white/5 overflow-y-auto">
                {filtered.map((r) => {
                  const rankDelta = delta(r.latest.rank, r.prev?.rank);
                  return (
                    <Button
                      variant="ghost"
                      key={r.horseId}
                      type="button"
                      onClick={() => setSelectedId(r.horseId)}
                      className={`flex h-auto w-full justify-start items-center gap-2 p-2 text-left text-[11px] font-mono transition-colors ${
                        selected?.horseId === r.horseId
                          ? "bg-white/10 text-cream"
                          : "text-cream/70 hover:bg-white/5"
                      }`}
                    >
                      <span className="w-7 text-right font-black tabular-nums text-primary">
                        {r.latest.rank ?? "—"}
                      </span>
                      <span className="flex-1 truncate font-sans font-bold">{r.name}</span>
                      {rankDelta ? (
                        <span
                          className={`tabular-nums ${rankDelta.up ? "text-success" : "text-destructive"}`}
                        >
                          {rankDelta.up ? "▲" : "▼"}
                          {Math.abs((r.latest.rank ?? 0) - (r.prev?.rank ?? r.latest.rank ?? 0))}
                        </span>
                      ) : null}
                    </Button>
                  );
                })}
                {filtered.length === 0 ? (
                  <p className="p-3 text-[10px] font-mono uppercase text-cream/30">
                    No horses match.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {selected ? (
            <div className="space-y-4">
              <Card className="border-white/5 bg-slate-900/40">
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-[160px] flex-1">
                    <Link
                      to="/stable/$horseId"
                      params={{ horseId: selected.horseId }}
                      className="text-base font-black text-cream hover:text-primary"
                    >
                      {selected.name}
                    </Link>
                    <p className="text-[10px] font-mono uppercase tracking-wide text-cream/40">
                      {selected.snaps.length} daily snapshot
                      {selected.snaps.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Stat
                    label="Rank"
                    value={selected.latest.rank ? `#${selected.latest.rank}` : "Unranked"}
                  />
                  <Stat label="Points" value={selected.latest.points.toFixed(1)} />
                  <Stat label="Reputation" value={String(selected.latest.reputation)} />
                  <Stat label="Auction price" value={formatCurrency(selected.latest.price)} />
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <TrendCard
                  title="Rank (lower is better)"
                  data={selected.snaps.filter((s) => s.rank !== null).map((s) => -(s.rank ?? 0))}
                />
                <TrendCard title="Reputation" data={selected.snaps.map((s) => s.reputation)} />
                <TrendCard title="Auction price" data={selected.snaps.map((s) => s.price)} />
              </div>

              <Card className="border-white/5 bg-slate-900/40">
                <CardContent className="p-0">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-cream/40">
                        <th className="p-2">Day</th>
                        <th className="p-2 text-right">Rank</th>
                        <th className="p-2 text-right">Points</th>
                        <th className="p-2 text-right">Reputation</th>
                        <th className="p-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[...selected.snaps].reverse().map((s: RankingsSnapshot) => (
                        <tr key={s.day} className="text-cream/80">
                          <td className="p-2 tabular-nums">Day {s.day}</td>
                          <td className="p-2 text-right tabular-nums font-black text-primary">
                            {s.rank ? `#${s.rank}` : "Unranked"}
                          </td>
                          <td className="p-2 text-right tabular-nums">{s.points.toFixed(1)}</td>
                          <td className="p-2 text-right tabular-nums">{s.reputation}</td>
                          <td className="p-2 text-right tabular-nums">{formatCurrency(s.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-wide text-cream/40">{label}</p>
      <p className="text-sm font-black tabular-nums text-cream">{value}</p>
    </div>
  );
}

function signed(n: number, money = false) {
  if (n === 0) return "Level";
  return `${n > 0 ? "+" : "−"}${money ? formatCurrency(Math.abs(n)) : Math.abs(Math.round(n * 10) / 10)}`;
}

function ComparisonTable({
  title,
  rows,
  empty = "No ranked horses that day.",
}: {
  title: string;
  rows: RankingsComparisonRow[];
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-1 text-[10px] font-mono uppercase tracking-wide text-primary">{title}</p>
      {rows.length === 0 ? (
        <p className="text-[11px] text-cream/40">{empty}</p>
      ) : (
        <table className="w-full min-w-[620px] text-[11px] font-mono">
          <thead>
            <tr className="text-left text-[9px] uppercase text-cream/40">
              <th className="p-1.5">Horse</th>
              <th className="text-right">Rank</th>
              <th className="text-right">Points</th>
              <th className="text-right">Reputation</th>
              <th className="text-right">Price</th>
              <th className="pl-3">Gap to #1</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr
                key={r.horseId}
                className={r.isPlayer ? "bg-primary/10 text-cream" : "text-cream/75"}
              >
                <td className="p-1.5 font-sans font-bold">
                  {r.name}
                  {r.isPlayer ? " · Yours" : ""}
                </td>
                <td className="text-right tabular-nums">
                  {r.snapshot?.rank ? `#${r.snapshot.rank}` : r.snapshot ? "Unranked" : "No record"}
                </td>
                <td className="text-right tabular-nums">{r.snapshot?.points.toFixed(1) ?? "—"}</td>
                <td className="text-right tabular-nums">{r.snapshot?.reputation ?? "—"}</td>
                <td className="text-right tabular-nums">
                  {r.snapshot ? formatCurrency(r.snapshot.price) : "—"}
                </td>
                <td className="pl-3 text-[10px] text-cream/50">
                  {r.gap
                    ? `${r.gap.rank === null ? "Unranked" : r.gap.rank === 0 ? "Leader" : `${r.gap.rank} places`} · ${signed(r.gap.points)} pts · ${signed(r.gap.reputation)} rep · ${signed(r.gap.price, true)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function TrendCard({ title, data }: { title: string; data: number[] }) {
  return (
    <Card className="border-white/5 bg-slate-900/40">
      <CardContent className="p-3">
        <p className="mb-1 text-[10px] font-mono uppercase tracking-wide text-cream/40">{title}</p>
        {data.length > 1 ? (
          <Sparkline data={data} height={56} />
        ) : (
          <p className="py-4 text-center text-[10px] font-mono uppercase text-cream/30">
            Needs 2+ days
          </p>
        )}
      </CardContent>
    </Card>
  );
}
