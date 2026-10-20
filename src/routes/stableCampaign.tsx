import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Progress } from "@/shared/ui/progress";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import type { Horse } from "@/domains/horse/simulation/types";
import type { HorseDailyProgress } from "@/domains/horse/simulation/dailyProgress";
import type { RankingsHistory } from "@/domains/market/simulation/rankingsHistory";
import type { TrackLedgerEntry } from "@/domains/history/simulation/trackLedger";
import type { StrategyJournalEntry } from "@/domains/tactics/simulation/strategyJournal";
import { buildCampaignHistory } from "@/domains/stable/simulation/campaignHistory";
import {
  DEFAULT_STABLE_GOALS,
  GOAL_CLASSES,
  goalProgress,
  playerNetWorthBreakdown,
  type StableGoals,
} from "@/domains/stable/simulation/stableGoals";

export const Route = createFileRoute("/stableCampaign")({
  head: () => ({
    meta: [
      { title: "Stable Campaign — Stable Strategy" },
      {
        name: "description",
        content: "Set your stable's net-worth target and class win goals to steer race entries.",
      },
      { property: "og:title", content: "Stable Campaign — Stable Strategy" },
      {
        property: "og:description",
        content: "Goals that the Race Advisor and auto-entry prioritise.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StableCampaignPage,
});

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;
const STRENGTH = [
  { v: 0, label: "Off" },
  { v: 0.5, label: "Light" },
  { v: 1, label: "Normal" },
  { v: 2, label: "Strong" },
];

function StableCampaignPage() {
  const saved = useGame((s) => s.stableGoals);
  const horses = useGame((s) => s.horses);
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  const autoEnter = useGame((s) => s.userSettings?.gameplay?.autoEnterRaces ?? false);

  const [draft, setDraft] = useState<StableGoals>(
    saved ?? { ...DEFAULT_STABLE_GOALS, startDay: day },
  );
  useEffect(() => {
    if (saved) setDraft(saved);
  }, [saved]);

  const progress = useMemo(
    () => goalProgress(saved ?? draft, Object.values(horses), cash),
    [saved, draft, horses, cash],
  );

  const save = () => {
    useGame.setState({ stableGoals: draft });
    toast.success("Campaign goals saved.");
  };
  const clear = () => {
    useGame.setState({ stableGoals: undefined });
    setDraft({ ...DEFAULT_STABLE_GOALS, startDay: day });
    toast.success("Campaign goals cleared.");
  };

  const worth = useMemo(
    () => playerNetWorthBreakdown(Object.values(horses), cash),
    [horses, cash],
  );

  const nwPct = draft.targetNetWorth
    ? Math.min(100, (progress.netWorth / draft.targetNetWorth) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black font-[family-name:var(--font-display)] text-foreground">
          Stable Campaign
        </h1>
        <p className="text-sm text-muted-foreground">
          Set what your stable is chasing. The{" "}
          <Link to="/race-advisor" className="text-primary hover:underline">
            Race Advisor
          </Link>{" "}
          lists goal races first. While a class goal is open, Auto-Register and Daily Auto-Entry
          enter each horse in its next suitable goal race.
          {!autoEnter && " (Daily Auto-Entry is off — turn it on in Settings → Gameplay.)"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Net worth target</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <label className="space-y-1 text-xs text-muted-foreground">
              Target net worth ($)
              <Input
                type="number"
                aria-label="Target net worth"
                className="w-48"
                value={draft.targetNetWorth ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, targetNetWorth: Number(e.target.value) || undefined })
                }
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              By game day (optional)
              <Input
                type="number"
                aria-label="Target day"
                className="w-32"
                value={draft.targetDay ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, targetDay: Number(e.target.value) || undefined })
                }
              />
            </label>
          </div>
          <div className="text-sm">
            Current net worth: <span className="font-mono">{money(progress.netWorth)}</span>
            {draft.targetNetWorth ? (
              <>
                {" "}
                · gap{" "}
                <span className="font-mono">
                  {money(Math.max(0, draft.targetNetWorth - progress.netWorth))}
                </span>
                {draft.targetDay && draft.targetDay > day && (
                  <> · {draft.targetDay - day} days left</>
                )}
              </>
            ) : null}
          </div>
          {draft.targetNetWorth ? <Progress value={nwPct} aria-label="Net worth progress" /> : null}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div>
              Cash <span className="font-mono text-foreground/80">{money(worth.cash)}</span> + horses{" "}
              <span className="font-mono text-foreground/80">{money(worth.horseValue)}</span> (
              {worth.horses.length} horse{worth.horses.length === 1 ? "" : "s"} at today&apos;s
              market value)
            </div>
            {worth.horses.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {worth.horses.slice(0, 12).map((h) => (
                  <li key={h.id}>
                    <Link
                      to="/stable/$horseId"
                      params={{ horseId: h.id }}
                      className="hover:text-primary"
                    >
                      {h.name}
                    </Link>{" "}
                    <span className="font-mono text-foreground/80">{money(h.value)}</span>
                  </li>
                ))}
                {worth.horses.length > 12 ? <li>+{worth.horses.length - 12} more</li> : null}
              </ul>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">
            Cash &amp; earnings targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-4">
              <label className="space-y-1 text-xs text-muted-foreground">
                Target cash on hand ($)
                <Input
                  type="number"
                  aria-label="Target cash on hand"
                  className="w-48"
                  value={draft.targetCash ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, targetCash: Number(e.target.value) || undefined })
                  }
                />
              </label>
            </div>
            <div className="text-sm">
              Cash on hand: <span className="font-mono">{money(progress.currentCash)}</span>
              {draft.targetCash ? (
                <>
                  {" "}
                  · gap <span className="font-mono">{money(progress.cashGap)}</span>
                </>
              ) : null}
            </div>
            {draft.targetCash ? (
              <Progress
                value={Math.min(100, (progress.currentCash / draft.targetCash) * 100)}
                aria-label="Cash target progress"
              />
            ) : null}
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-end gap-4">
              <label className="space-y-1 text-xs text-muted-foreground">
                Prize earnings target ($, since day {draft.startDay})
                <Input
                  type="number"
                  aria-label="Prize earnings target"
                  className="w-48"
                  value={draft.targetEarnings ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, targetEarnings: Number(e.target.value) || undefined })
                  }
                />
              </label>
            </div>
            <div className="text-sm">
              Earned so far: <span className="font-mono">{money(progress.totalEarnings)}</span>
              {draft.targetEarnings ? (
                <>
                  {" "}
                  · gap <span className="font-mono">{money(progress.earningsGap)}</span>
                </>
              ) : null}
            </div>
            {draft.targetEarnings ? (
              <Progress
                value={Math.min(100, (progress.totalEarnings / draft.targetEarnings) * 100)}
                aria-label="Earnings target progress"
              />
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            While a target is unmet, the Race Advisor and Auto-Entry score richer purses higher so
            entries chase the money you need.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Class goals (wins)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            {GOAL_CLASSES.map((c) => {
              const target = draft.classGoals[c] ?? 0;
              const won = progress.classWins[c];
              return (
                <div key={c} className="space-y-1 rounded-md border border-border p-3">
                  <div className="text-xs uppercase text-muted-foreground">{c} wins</div>
                  <Input
                    type="number"
                    min={0}
                    aria-label={`${c} win goal`}
                    value={target || ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        classGoals: {
                          ...draft.classGoals,
                          [c]: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                  />
                  <div className="text-xs">
                    {won} won{target ? ` of ${target}` : ""}
                  </div>
                  {target > 0 && <Progress value={Math.min(100, (won / target) * 100)} />}
                </div>
              );
            })}
          </div>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Count wins from game day
            <Input
              type="number"
              aria-label="Count wins from day"
              className="w-32"
              value={draft.startDay}
              onChange={(e) => setDraft({ ...draft, startDay: Number(e.target.value) || 0 })}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">
            How strongly to prioritise
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {STRENGTH.map((s) => (
            <Button
              key={s.v}
              size="sm"
              variant={draft.weight === s.v ? "default" : "outline"}
              onClick={() => setDraft({ ...draft, weight: s.v })}
            >
              {s.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">
            Automatic goal adjustment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="Adjust goals automatically"
              checked={draft.autoAdjust ?? false}
              onChange={(e) => setDraft({ ...draft, autoAdjust: e.target.checked })}
            />
            Adjust goals automatically each day
          </label>
          <p className="text-xs text-muted-foreground">
            When a class goal is met it rises by half its size (at least one more win). When your
            net worth reaches the target, the target rises to 125% of your current net worth.
            Reached cash and earnings targets rise to 125% of current value the same way. A missed
            deadline is pushed back 90 days.
          </p>
          {(saved?.adjustmentLog ?? []).length > 0 && (
            <ul className="space-y-1 text-xs">
              {saved!.adjustmentLog!.map((a, i) => (
                <li key={i}>
                  <span className="font-mono text-muted-foreground">Day {a.day}</span> · {a.text}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={save}>Save goals</Button>
        <Button variant="ghost" onClick={clear}>
          Clear goals
        </Button>
        {saved && <span className="self-center text-xs text-muted-foreground">Goals active.</span>}
      </div>

      <CampaignHistoryCard goals={saved ?? draft} horses={horses} />
    </div>
  );
}

const EMPTY_LEDGER: TrackLedgerEntry[] = [];
const EMPTY_RANKINGS: RankingsHistory = {};
const EMPTY_DAILY: HorseDailyProgress = {};
const EMPTY_JOURNAL: StrategyJournalEntry[] = [];
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const signedMoney = (n: number) => `${n > 0 ? "+" : "−"}${money(Math.abs(n))}`;

function CampaignHistoryCard({
  goals,
  horses,
}: {
  goals: StableGoals;
  horses: Record<string, Horse>;
}) {
  const ledger = useGameWithShallow((s) => s.trackLedger ?? EMPTY_LEDGER) as TrackLedgerEntry[];
  const rankingsHistory = useGame((s) => s.rankingsHistory ?? EMPTY_RANKINGS);
  const dailyProgress = useGame((s) => s.horseDailyProgress ?? EMPTY_DAILY);
  const journal = useGameWithShallow(
    (s) => s.strategyJournal ?? EMPTY_JOURNAL,
  ) as StrategyJournalEntry[];
  const currentDay = useGame((s) => s.day);
  const rows = useMemo(
    () =>
      buildCampaignHistory(
        goals,
        Object.values(horses),
        ledger,
        [rankingsHistory, dailyProgress],
        journal,
        currentDay,
      ).reverse(),
    [goals, horses, ledger, rankingsHistory, dailyProgress, journal, currentDay],
  );
  const last = rows[0];
  const worthDelta = rows.reduce((sum, r) => sum + (r.valueDelta ?? 0), 0);
  const hasWorth = rows.some((r) => r.value !== null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide">
          Campaign history (since day {goals.startDay})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No races run since the campaign started. Each start will appear here with its prize
            money, horse value, prestige and class wins.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                Starts: <span className="font-mono">{rows.length}</span>
              </span>
              <span>
                Wins:{" "}
                <span className="font-mono">{rows.filter((r) => r.position === 1).length}</span>
              </span>
              <span>
                Prize money:{" "}
                <span className="font-mono text-success">+{money(last.cumulativePrize)}</span>
              </span>
              <span>
                Horse value Δ:{" "}
                <span
                  className={`font-mono ${
                    worthDelta > 0 ? "text-success" : worthDelta < 0 ? "text-destructive" : ""
                  }`}
                >
                  {hasWorth ? signedMoney(worthDelta) : "—"}
                </span>
              </span>
              <span>
                Prestige: <span className="font-mono">{signed(last.cumulativePrestige)}</span>
              </span>
              <span>
                Goal wins:{" "}
                <span className="font-mono">{rows.filter((r) => r.countedForGoal).length}</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-1 pr-3">
                      Day
                    </th>
                    <th scope="col" className="pr-3">
                      Horse
                    </th>
                    <th scope="col" className="pr-3">
                      Race
                    </th>
                    <th scope="col" className="pr-3">
                      Class
                    </th>
                    <th scope="col" className="pr-3">
                      Finish
                    </th>
                    <th scope="col" className="pr-3 text-right">
                      Prize money
                    </th>
                    <th scope="col" className="pr-3 text-right">
                      Worth
                    </th>
                    <th scope="col" className="pr-3 text-right">
                      Net Δ
                    </th>
                    <th scope="col" className="pr-3">
                      Plan
                    </th>
                    <th scope="col" className="pr-3 text-right">
                      Prestige
                    </th>
                    <th scope="col" className="pr-3">
                      Class wins
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.raceId}-${r.horseId}`} className="border-t border-border">
                      <td className="py-1 pr-3 font-mono">{r.day}</td>
                      <td className="pr-3">
                        <Link
                          to="/stable/$horseId"
                          params={{ horseId: r.horseId }}
                          className="hover:text-primary hover:underline"
                        >
                          {r.horseName}
                        </Link>
                      </td>
                      <td className="pr-3">{r.raceName}</td>
                      <td className="pr-3">{r.goalClass ?? "—"}</td>
                      <td className="pr-3 font-mono">
                        {r.position}
                        {r.fieldSize ? `/${r.fieldSize}` : ""}
                      </td>
                      <td className="pr-3 text-right font-mono">
                        {r.prize > 0 ? (
                          <span className="text-success">+{money(r.prize)}</span>
                        ) : (
                          "—"
                        )}
                        <div className="text-xs text-muted-foreground">
                          total {money(r.cumulativePrize)}
                        </div>
                      </td>
                      <td className="pr-3 text-right font-mono">
                        {r.value === null ? (
                          "—"
                        ) : (
                          <>
                            {money(r.value)}
                            {r.valueDelta !== null && r.valueDelta !== 0 && (
                              <div
                                className={`text-xs ${
                                  r.valueDelta > 0 ? "text-success" : "text-destructive"
                                }`}
                              >
                                {signedMoney(r.valueDelta)}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      <td className="pr-3 text-right font-mono">
                        {r.netDelta === null ? (
                          "—"
                        ) : (
                          <span
                            className={
                              r.netDelta > 0
                                ? "text-success"
                                : r.netDelta < 0
                                  ? "text-destructive"
                                  : ""
                            }
                          >
                            {signedMoney(r.netDelta)}
                          </span>
                        )}
                      </td>
                      <td className="pr-3 text-xs max-w-[12rem]">
                        {r.plan ? (
                          <span title={r.plan.text}>
                            <span className="block truncate text-muted-foreground">
                              {r.plan.text}
                            </span>
                            {r.plan.outcome.status === "run" && (
                              <span
                                className={
                                  r.plan.outcome.position === 1
                                    ? "text-success"
                                    : "text-muted-foreground"
                                }
                              >
                                {r.plan.outcome.position === 1
                                  ? "Won"
                                  : `Finished ${r.plan.outcome.position}`}
                              </span>
                            )}
                            {r.plan.outcome.status === "pending" && (
                              <span className="text-muted-foreground">Upcoming</span>
                            )}
                            {r.plan.outcome.status === "missing" && (
                              <span className="text-muted-foreground">Did not run</span>
                            )}
                          </span>
                        ) : (
                          <Link
                            to="/strategyJournal"
                            search={{ horse: r.horseId }}
                            className="text-muted-foreground/60 hover:text-primary hover:underline"
                          >
                            Log plan
                          </Link>
                        )}
                      </td>
                      <td
                        className={`pr-3 text-right font-mono ${
                          (r.prestige ?? 0) > 0
                            ? "text-success"
                            : (r.prestige ?? 0) < 0
                              ? "text-destructive"
                              : ""
                        }`}
                      >
                        {r.prestige === null ? "—" : signed(r.prestige)}
                      </td>
                      <td className="pr-3 text-xs">
                        {r.goalClass && r.position === 1 ? (
                          <span className={r.countedForGoal ? "text-primary" : ""}>
                            {r.goalClass} win #{r.classWinsAfter}
                            {r.countedForGoal ? " ★ goal" : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Worth is the horse's market value at the end of that race day — it reflects the whole
              day's changes (training, aging, other races), not just this race; "—" means no
              snapshot was recorded. Net Δ = prize money + worth change. Plan shows the Strategy
              Journal entry linked to this race ("Log plan" creates one); races without a journal
              entry have none to show. Prestige comes from Course Histories.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
