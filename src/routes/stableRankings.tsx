/**
 * stable-rankings.tsx - Stable league table recorded daily.
 *
 * Shows the player's stable rank, roster ranking points, earned points,
 * windowed earnings, normalized reputation and roster market value against
 * every NPC stable, with per-stable trends and a day-by-day history table.
 *
 * Dependencies: @/game/store, @/core/stable/stableRankings,
 *   @/core/stable/stableReputationTier, @/core/reputation, @/core/horse/ownership
 * Related files: src/routes/rankings-history.tsx (per-horse equivalent),
 *   src/core/time/phases/dailySnapshotPhase.ts (records the snapshots)
 */

import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/charts/Sparkline";
import { SilkDot } from "@/components/SilkDot";
import { PillToggleGroup } from "@/components/common/PillToggleGroup";
import { useGameWithShallow } from "@/game/store";
import { formatCurrency } from "@/lib/formatting";
import type { StableRankingsHistory, StableRankingsSnapshot } from "@/core/stable/stableRankings";
import { getStableReputationTierMeta } from "@/core/stable/stableReputationTier";
import { formatReputationTier } from "@/core/reputation";
import { PLAYER_OWNER_ID } from "@/core/horse/ownership";

const EMPTY_HISTORY: StableRankingsHistory = {};

const SORT_KEYS = [
  { value: "points", label: "Points" },
  { value: "earnedPoints", label: "Earned pts" },
  { value: "earnings", label: "Earnings" },
  { value: "reputation", label: "Reputation" },
  { value: "price", label: "Value" },
] as const;
type SortKey = (typeof SORT_KEYS)[number]["value"];

export const Route = createFileRoute("/stableRankings")({
  head: () => ({
    meta: [
      { title: "Stable Rankings — Position, Points, Reputation & Value Over Time" },
      {
        name: "description",
        content:
          "Track your stable's world position, ranking points, earnings, reputation and roster value against every rival stable, day by day.",
      },
    ],
  }),
  component: StableRankingsPage,
});

/** Direction-aware delta: for rank lower is better, for the rest higher is better. */
function delta(
  now: number | null,
  then: number | null | undefined,
  lowerIsBetter = false,
): { text: string; up: boolean } | null {
  if (now === null || then == null || then === now) return null;
  const d = now - then;
  return {
    text: `${d > 0 ? "+" : "−"}${Math.abs(Math.round(d * 10) / 10)}`,
    up: lowerIsBetter ? d < 0 : d > 0,
  };
}

interface StableRow {
  stableId: string;
  name: string;
  isPlayer: boolean;
  silkColor: string | undefined;
  latest: StableRankingsSnapshot;
  prev: StableRankingsSnapshot | undefined;
  snaps: StableRankingsSnapshot[];
}

function StableRankingsPage() {
  const history = useGameWithShallow(
    (s) => (s.stableRankingsHistory as StableRankingsHistory | undefined) ?? EMPTY_HISTORY,
  );
  const npcStables = useGameWithShallow((s) => s.npcStables ?? []);
  const playerProfile = useGameWithShallow((s) => s.playerProfile);
  const reputation = useGameWithShallow((s) => s.reputation);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("points");

  const rows = useMemo<StableRow[]>(() => {
    const meta = new Map(npcStables.map((s) => [s.id as string, s]));
    return Object.entries(history)
      .map(([stableId, snaps]) => {
        const latest = snaps[snaps.length - 1];
        const isPlayer = stableId === PLAYER_OWNER_ID;
        const stable = meta.get(stableId);
        return {
          stableId,
          name: isPlayer
            ? (playerProfile?.stableName ?? "Your stable")
            : (stable?.name ?? "Unknown stable"),
          isPlayer,
          silkColor: isPlayer ? playerProfile?.silk?.primary : stable?.colors?.primary,
          latest,
          prev: snaps.length > 1 ? snaps[snaps.length - 2] : undefined,
          snaps,
        };
      })
      .filter((r): r is StableRow => r.latest !== undefined);
  }, [history, npcStables, playerProfile]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.latest[sortKey] - a.latest[sortKey]),
    [rows, sortKey],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => r.name.toLowerCase().includes(q));
  }, [sorted, query]);

  const playerRow = rows.find((r) => r.isPlayer) ?? null;
  const selected = selectedId
    ? (rows.find((r) => r.stableId === selectedId) ?? null)
    : (playerRow ?? rows[0] ?? null);

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-black text-cream">Stable Rankings</h1>
          <p className="text-[11px] font-mono uppercase tracking-wide text-cream/40">
            Position, points, reputation and stable value vs every yard — recorded daily
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Card className="border-white/5 bg-slate-900/40">
          <CardContent className="p-6 text-center text-[11px] font-mono uppercase tracking-wide text-cream/40">
            No stable rankings recorded yet. Advance a day and snapshots will appear here.
          </CardContent>
        </Card>
      ) : (
        <>
          {playerRow ? (
            <Card className="border-gold/30 bg-slate-900/40">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[160px] flex-1">
                  <Link to="/stable" className="text-base font-black text-gold hover:text-primary">
                    {playerRow.name}
                  </Link>
                  <p className="text-[10px] font-mono uppercase tracking-wide text-cream/40">
                    Your stable · {playerRow.snaps.length} daily snapshot
                    {playerRow.snaps.length === 1 ? "" : "s"} ·{" "}
                    {formatReputationTier(reputation?.tier ?? "unknown")}
                  </p>
                </div>
                <DeltaStat
                  label="Rank"
                  value={playerRow.latest.rank ? `#${playerRow.latest.rank}` : "Unranked"}
                  d={delta(playerRow.latest.rank, playerRow.prev?.rank, true)}
                  rankDelta
                />
                <DeltaStat
                  label="Points"
                  value={playerRow.latest.points.toFixed(1)}
                  d={delta(playerRow.latest.points, playerRow.prev?.points)}
                />
                <DeltaStat
                  label="Earned pts"
                  value={playerRow.latest.earnedPoints.toFixed(1)}
                  d={delta(playerRow.latest.earnedPoints, playerRow.prev?.earnedPoints)}
                />
                <DeltaStat
                  label="Earnings (365d)"
                  value={formatCurrency(playerRow.latest.earnings)}
                  d={delta(playerRow.latest.earnings, playerRow.prev?.earnings)}
                />
                <DeltaStat
                  label="Reputation"
                  value={String(playerRow.latest.reputation)}
                  d={delta(playerRow.latest.reputation, playerRow.prev?.reputation)}
                />
                <DeltaStat
                  label="Roster value"
                  value={formatCurrency(playerRow.latest.price)}
                  d={delta(playerRow.latest.price, playerRow.prev?.price)}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-white/5 bg-slate-900/40">
            <CardContent className="space-y-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stables…"
                  aria-label="Search ranked stables"
                  className="h-8 max-w-xs text-xs"
                />
                <PillToggleGroup
                  label="Sort by"
                  options={SORT_KEYS}
                  value={sortKey}
                  onChange={(k) => setSortKey(k as SortKey)}
                  ariaLabel="Sort stable rankings"
                />
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead className="sticky top-0 bg-slate-900">
                    <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-cream/40">
                      <th className="p-2 w-8 text-right">#</th>
                      <th className="p-2">Stable</th>
                      <th className="p-2 text-right">Points</th>
                      <th className="p-2 text-right">Earned</th>
                      <th className="p-2 text-right">Earnings</th>
                      <th className="p-2 text-right">Rep</th>
                      <th className="p-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((r) => (
                      <tr
                        key={r.stableId}
                        onClick={() => setSelectedId(r.stableId)}
                        className={`cursor-pointer transition-colors ${
                          selected?.stableId === r.stableId
                            ? "bg-white/10"
                            : r.isPlayer
                              ? "bg-gold/10 hover:bg-gold/15"
                              : "hover:bg-white/5"
                        }`}
                      >
                        <td className="p-2 text-right tabular-nums font-black text-primary">
                          {r.latest.rank ?? "—"}
                        </td>
                        <td className="p-2">
                          <span className="flex items-center gap-2 font-sans font-bold">
                            {r.silkColor ? <SilkDot color={r.silkColor} size="sm" /> : null}
                            <span className={r.isPlayer ? "text-gold" : "text-cream/80"}>
                              {r.isPlayer ? (
                                r.name
                              ) : (
                                <Link
                                  to="/npc-stables/$stableId"
                                  params={{ stableId: r.stableId }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {r.name}
                                </Link>
                              )}
                            </span>
                            {!r.isPlayer ? (
                              <Badge
                                variant="outline"
                                className="text-[8px] h-3.5 px-1 text-cream/40 border-white/10"
                              >
                                {getStableReputationTierMeta(r.latest.reputation).label}
                              </Badge>
                            ) : null}
                          </span>
                        </td>
                        <td className="p-2 text-right tabular-nums text-cream/80">
                          {r.latest.points.toFixed(1)}
                        </td>
                        <td className="p-2 text-right tabular-nums text-cream/80">
                          {r.latest.earnedPoints.toFixed(1)}
                        </td>
                        <td className="p-2 text-right tabular-nums text-cream/80">
                          {formatCurrency(r.latest.earnings)}
                        </td>
                        <td className="p-2 text-right tabular-nums text-cream/80">
                          {r.latest.reputation}
                        </td>
                        <td className="p-2 text-right tabular-nums text-cream/80">
                          {formatCurrency(r.latest.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 ? (
                  <p className="p-3 text-[10px] font-mono uppercase text-cream/30">
                    No stables match.
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
                    {selected.isPlayer ? (
                      <Link
                        to="/stable"
                        className="text-base font-black text-gold hover:text-primary"
                      >
                        {selected.name}
                      </Link>
                    ) : (
                      <Link
                        to="/npc-stables/$stableId"
                        params={{ stableId: selected.stableId }}
                        className="text-base font-black text-cream hover:text-primary"
                      >
                        {selected.name}
                      </Link>
                    )}
                    <p className="text-[10px] font-mono uppercase tracking-wide text-cream/40">
                      {selected.isPlayer
                        ? formatReputationTier(reputation?.tier ?? "unknown")
                        : getStableReputationTierMeta(selected.latest.reputation).label}{" "}
                      · {selected.snaps.length} daily snapshot
                      {selected.snaps.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Stat
                    label="Rank"
                    value={selected.latest.rank ? `#${selected.latest.rank}` : "Unranked"}
                  />
                  <Stat label="Points" value={selected.latest.points.toFixed(1)} />
                  <Stat label="Earned pts" value={selected.latest.earnedPoints.toFixed(1)} />
                  <Stat label="Earnings" value={formatCurrency(selected.latest.earnings)} />
                  <Stat label="Reputation" value={String(selected.latest.reputation)} />
                  <Stat label="Roster value" value={formatCurrency(selected.latest.price)} />
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <TrendCard
                  title="Rank (lower is better)"
                  data={selected.snaps.filter((s) => s.rank !== null).map((s) => -(s.rank ?? 0))}
                />
                <TrendCard title="Reputation" data={selected.snaps.map((s) => s.reputation)} />
                <TrendCard title="Roster value" data={selected.snaps.map((s) => s.price)} />
              </div>

              <Card className="border-white/5 bg-slate-900/40">
                <CardContent className="p-0">
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-cream/40">
                        <th className="p-2">Day</th>
                        <th className="p-2 text-right">Rank</th>
                        <th className="p-2 text-right">Points</th>
                        <th className="p-2 text-right">Earned</th>
                        <th className="p-2 text-right">Earnings</th>
                        <th className="p-2 text-right">Rep</th>
                        <th className="p-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[...selected.snaps].reverse().map((s: StableRankingsSnapshot) => (
                        <tr key={s.day} className="text-cream/80">
                          <td className="p-2 tabular-nums">Day {s.day}</td>
                          <td className="p-2 text-right tabular-nums font-black text-primary">
                            {s.rank ? `#${s.rank}` : "Unranked"}
                          </td>
                          <td className="p-2 text-right tabular-nums">{s.points.toFixed(1)}</td>
                          <td className="p-2 text-right tabular-nums">
                            {s.earnedPoints.toFixed(1)}
                          </td>
                          <td className="p-2 text-right tabular-nums">
                            {formatCurrency(s.earnings)}
                          </td>
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
        </>
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

function DeltaStat({
  label,
  value,
  d,
  rankDelta = false,
}: {
  label: string;
  value: string;
  d: { text: string; up: boolean } | null;
  rankDelta?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-wide text-cream/40">{label}</p>
      <p className="text-sm font-black tabular-nums text-cream">
        {value}
        {d ? (
          <span
            className={`ml-1.5 text-[10px] font-mono tabular-nums ${
              d.up ? "text-success" : "text-destructive"
            }`}
          >
            {rankDelta ? (d.up ? "▲" : "▼") + d.text.replace(/^[+−]/, "") : d.text}
          </span>
        ) : null}
      </p>
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
