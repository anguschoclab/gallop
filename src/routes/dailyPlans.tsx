/**
 * /daily-plans - Day-by-day strategy timeline.
 *
 * Groups the player's campaign history into one card per race day: the
 * horses entered, their finishes and prizes, the campaign goal classes
 * served, the journaled plan text, and a daily plan-effectiveness score
 * (same formula as the Strategy Journal dimension table).
 *
 * Dependencies: @/core/stable/campaignHistory, @/core/tactics/dailyPlanView,
 *   @/game/store
 * Related files: src/routes/stableCampaign.tsx, src/routes/strategyJournal.tsx
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { FilterX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import { buildCampaignHistory } from "@/domains/stable/simulation/campaignHistory";
import { DEFAULT_STABLE_GOALS } from "@/domains/stable/simulation/stableGoals";
import { buildDailyPlanTimeline } from "@/domains/tactics/simulation/dailyPlanView";
import { formatCurrency } from "@/shared/common/formatting";;
import type { Horse } from "@/domains/horse/simulation/types";
import type { HorseDailyProgress } from "@/domains/horse/simulation/dailyProgress";
import type { RankingsHistory } from "@/domains/market/simulation/rankingsHistory";
import type { StrategyJournalEntry } from "@/domains/tactics/simulation/strategyJournal";
import type { TrackLedgerEntry } from "@/domains/history/simulation/trackLedger";

export const Route = createFileRoute("/dailyPlans")({
  head: () => ({
    meta: [
      { title: "Daily Plans — Stable Strategy" },
      {
        name: "description",
        content:
          "Day-by-day view of your race choices, the campaign goals they served and how well your plans worked.",
      },
      { property: "og:title", content: "Daily Plans — Stable Strategy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyPlansPage,
});

const EMPTY_LEDGER: TrackLedgerEntry[] = [];
const EMPTY_RANKINGS: RankingsHistory = {};
const EMPTY_DAILY: HorseDailyProgress = {};
const EMPTY_JOURNAL: StrategyJournalEntry[] = [];

const scoreTone = (score: number | null) =>
  score === null
    ? "text-cream/40 border-white/10"
    : score >= 70
      ? "text-emerald-400 border-emerald-400/40"
      : score >= 40
        ? "text-gold border-gold/40"
        : "text-rose-400 border-rose-400/40";

function DailyPlansPage() {
  const goals = useGame((s) => s.stableGoals);
  const horses = useGame((s) => s.horses);
  const ledger = useGameWithShallow((s) => s.trackLedger ?? EMPTY_LEDGER) as TrackLedgerEntry[];
  const rankingsHistory = useGame((s) => s.rankingsHistory ?? EMPTY_RANKINGS);
  const dailyProgress = useGame((s) => s.horseDailyProgress ?? EMPTY_DAILY);
  const journal = useGameWithShallow(
    (s) => s.strategyJournal ?? EMPTY_JOURNAL,
  ) as StrategyJournalEntry[];
  const currentDay = useGame((s) => s.day);

  const days = useMemo(() => {
    const allHorses: Horse[] = Object.values(horses);
    const rows = buildCampaignHistory(
      goals ?? { ...DEFAULT_STABLE_GOALS, startDay: 0 },
      allHorses,
      ledger,
      [rankingsHistory, dailyProgress],
      journal,
      currentDay,
    );
    return buildDailyPlanTimeline(rows);
  }, [goals, horses, ledger, rankingsHistory, dailyProgress, journal, currentDay]);

  const [horseFilter, setHorseFilter] = useState("all");
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");

  const horseOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of days) for (const r of d.races) m.set(r.horseId, r.horseName);
    return [...m.entries()];
  }, [days]);

  const filteredDays = useMemo(
    () =>
      days.filter(
        (d) =>
          (horseFilter === "all" || d.races.some((r) => r.horseId === horseFilter)) &&
          (fromDay === "" || d.day >= Number(fromDay)) &&
          (toDay === "" || d.day <= Number(toDay)),
      ),
    [days, horseFilter, fromDay, toDay],
  );
  const filtersActive = horseFilter !== "all" || fromDay !== "" || toDay !== "";

  const scored = filteredDays.filter((d) => d.score !== null);
  const avgScore =
    scored.length > 0 ? Math.round(scored.reduce((s, d) => s + d.score!, 0) / scored.length) : null;
  const totalPrize = filteredDays.reduce((s, d) => s + d.totalPrize, 0);
  const goalWins = filteredDays.reduce((s, d) => s + d.goalsServed.length, 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black font-[family-name:var(--font-display)] text-cream">
          Daily Plans
        </h1>
        <p className="text-sm text-muted-foreground">
          Each day's race choices, the{" "}
          <Link to="/stableCampaign" className="text-gold hover:underline">
            campaign goals
          </Link>{" "}
          they served, and how well the journaled plans worked — from your{" "}
          <Link to="/strategyJournal" className="text-gold hover:underline">
            Strategy Journal
          </Link>
          .
        </p>
      </div>

      {days.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-3">
            <label className="space-y-1 text-[11px] font-semibold uppercase text-muted-foreground">
              Horse
              <Select value={horseFilter} onValueChange={setHorseFilter}>
                <SelectTrigger aria-label="Filter by horse" className="h-8 w-48 text-xs">
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
            </label>
            <label className="space-y-1 text-[11px] font-semibold uppercase text-muted-foreground">
              From day
              <Input
                type="number"
                min={1}
                value={fromDay}
                onChange={(e) => setFromDay(e.target.value)}
                placeholder="First"
                aria-label="From game day"
                className="h-8 w-24 text-xs"
              />
            </label>
            <label className="space-y-1 text-[11px] font-semibold uppercase text-muted-foreground">
              To day
              <Input
                type="number"
                min={1}
                value={toDay}
                onChange={(e) => setToDay(e.target.value)}
                placeholder="Latest"
                aria-label="To game day"
                className="h-8 w-24 text-xs"
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!filtersActive}
              onClick={() => {
                setHorseFilter("all");
                setFromDay("");
                setToDay("");
              }}
            >
              <FilterX />
              Clear filters
            </Button>
            <span className="text-xs text-muted-foreground" aria-live="polite">
              Showing {filteredDays.length} of {days.length} days
            </span>
          </CardContent>
        </Card>
      )}

      {filteredDays.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            Days raced: <span className="font-mono">{filteredDays.length}</span>
          </span>
          <span>
            Avg plan score: <span className="font-mono">{avgScore === null ? "—" : avgScore}</span>
          </span>
          <span>
            Total prize:{" "}
            <span className="font-mono text-success">{formatCurrency(totalPrize)}</span>
          </span>
          <span>
            Goal wins served: <span className="font-mono">{goalWins}</span>
          </span>
        </div>
      )}

      {days.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No races recorded yet. Run a race — entries made manually or by Auto-Entry will appear
            here grouped by day once they finish.
          </CardContent>
        </Card>
      ) : filteredDays.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No days match these filters.
          </CardContent>
        </Card>
      ) : (
        filteredDays.map((d) => (
          <Card key={d.day}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono">Day {d.day}</span>
                <Badge variant="outline" className={scoreTone(d.score)}>
                  {d.score === null ? "no scored plan" : `plan score ${d.score}`}
                </Badge>
                {d.goalsServed.map((c) => (
                  <Badge key={c} variant="default" className="bg-gold text-slate-950">
                    {c} goal win
                  </Badge>
                ))}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {d.totalPrize > 0 ? `+${formatCurrency(d.totalPrize)}` : "no prize"} · prestige{" "}
                  {d.totalPrestige > 0 ? `+${d.totalPrestige}` : d.totalPrestige}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Horse</th>
                    <th className="pr-3">Race</th>
                    <th className="pr-3">Class</th>
                    <th className="pr-3">Finish</th>
                    <th className="pr-3 text-right">Prize</th>
                    <th className="pr-3">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {d.races.map((r) => (
                    <tr key={`${r.raceId}-${r.horseId}`} className="border-t border-border">
                      <td className="py-1.5 pr-3">
                        <Link
                          to="/stable/$horseId"
                          params={{ horseId: r.horseId }}
                          className="hover:text-gold hover:underline"
                        >
                          {r.horseName}
                        </Link>
                      </td>
                      <td className="pr-3">
                        <Link
                          to="/race/$raceId"
                          params={{ raceId: r.raceId }}
                          className="hover:text-gold hover:underline"
                        >
                          {r.raceName}
                        </Link>
                      </td>
                      <td className="pr-3">{r.goalClass ?? "—"}</td>
                      <td className="pr-3 font-mono">
                        {r.position}
                        {r.fieldSize ? `/${r.fieldSize}` : ""}
                        {r.countedForGoal && r.position === 1 && (
                          <span className="text-gold"> ★</span>
                        )}
                      </td>
                      <td className="pr-3 text-right font-mono">
                        {r.prize > 0 ? (
                          <span className="text-success">+{formatCurrency(r.prize)}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="pr-3 text-xs text-cream-muted max-w-[14rem]">
                        {r.planText ? (
                          <span className="block truncate" title={r.planText}>
                            {r.planText}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
