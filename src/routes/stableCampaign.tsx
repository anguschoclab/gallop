import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useGame, useGameWithShallow } from "@/game/store";
import type { Horse } from "@/core/horse/types";
import type { TrackLedgerEntry } from "@/core/history/trackLedger";
import { buildCampaignHistory } from "@/core/stable/campaignHistory";
import {
  DEFAULT_STABLE_GOALS,
  GOAL_CLASSES,
  goalProgress,
  type StableGoals,
} from "@/core/stable/stableGoals";

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

  const nwPct = draft.targetNetWorth
    ? Math.min(100, (progress.netWorth / draft.targetNetWorth) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black font-[family-name:var(--font-display)] text-cream">
          Stable Campaign
        </h1>
        <p className="text-sm text-muted-foreground">
          Set what your stable is chasing. The{" "}
          <Link to="/race-advisor" className="text-gold hover:underline">
            Race Advisor
          </Link>{" "}
          lists goal races first, and Auto-Register and Daily Auto-Entry favour them when choosing
          races.
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
            net worth reaches the target, the target rises to 125% of your current net worth. A
            missed deadline is pushed back 90 days.
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
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function CampaignHistoryCard({
  goals,
  horses,
}: {
  goals: StableGoals;
  horses: Record<string, Horse>;
}) {
  const ledger = useGameWithShallow((s) => s.trackLedger ?? EMPTY_LEDGER) as TrackLedgerEntry[];
  const rows = useMemo(
    () => buildCampaignHistory(goals, Object.values(horses), ledger).reverse(),
    [goals, horses, ledger],
  );
  const last = rows[0];
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
            No races run since the campaign started. Each start will appear here with its effect on
            net worth, prestige and class wins.
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
                Net worth from prizes:{" "}
                <span className="font-mono text-success">+{money(last.cumulativePrize)}</span>
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
                    <th className="py-1 pr-3">Day</th>
                    <th className="pr-3">Horse</th>
                    <th className="pr-3">Race</th>
                    <th className="pr-3">Class</th>
                    <th className="pr-3">Finish</th>
                    <th className="pr-3 text-right">Net worth</th>
                    <th className="pr-3 text-right">Prestige</th>
                    <th className="pr-3">Class wins</th>
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
                          className="hover:text-gold hover:underline"
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
                          <span className={r.countedForGoal ? "text-gold" : ""}>
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
              Net worth shows prize money won; horse value changes aren't tied to single races.
              Prestige comes from Course Histories, so "—" means it wasn't recorded.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
