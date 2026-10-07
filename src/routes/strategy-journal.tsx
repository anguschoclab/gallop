import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGame } from "@/game/store";
import { PlanEffectivenessCard } from "@/components/journal/PlanEffectivenessCard";
import { isPlayerOwned } from "@/core/horse/ownership";
import {
  addJournalEntry,
  journalOutcome,
  removeJournalEntry,
  updateJournalEntry,
  type JournalOutcome,
  type StrategyJournalEntry,
} from "@/core/tactics/strategyJournal";

export const Route = createFileRoute("/strategy-journal")({
  head: () => ({
    meta: [
      { title: "Strategy Journal — Stable Strategy" },
      {
        name: "description",
        content: "Record each race plan and its outcome, and review your decisions over time.",
      },
      { property: "og:title", content: "Strategy Journal — Stable Strategy" },
      {
        property: "og:description",
        content: "Your log of race plans, results and lessons learned.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StrategyJournalPage,
});

const EMPTY: StrategyJournalEntry[] = [];
const textareaCls =
  "w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm";

function OutcomeBadge({ o }: { o: JournalOutcome }) {
  if (o.status === "run")
    return (
      <Badge variant={o.position === 1 ? "default" : "outline"}>
        {o.position === 1 ? "Won" : `Finished ${o.position}${o.fieldSize ? `/${o.fieldSize}` : ""}`}
      </Badge>
    );
  if (o.status === "pending") return <Badge variant="secondary">Upcoming</Badge>;
  if (o.status === "missing") return <Badge variant="outline">Did not run</Badge>;
  return <Badge variant="outline">No race linked</Badge>;
}

function StrategyJournalPage() {
  const journal = useGame((s) => s.strategyJournal ?? EMPTY);
  const horses = useGame((s) => s.horses);
  const races = useGame((s) => s.races);
  const day = useGame((s) => s.day);

  const [horseFilter, setHorseFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [newHorse, setNewHorse] = useState("");
  const [newRace, setNewRace] = useState("none");
  const [newPlan, setNewPlan] = useState("");

  const myHorses = useMemo(
    () => Object.values(horses).filter((h) => isPlayerOwned(h) && h.lifecycleStatus === "active"),
    [horses],
  );
  const raceOptions = useMemo(
    () =>
      Object.values(races)
        .filter((r) => !newHorse || r.entries.some((e) => e.horseId === newHorse))
        .sort((a, b) => b.day - a.day)
        .slice(0, 40),
    [races, newHorse],
  );

  const rows = useMemo(
    () =>
      journal.map((e) => ({
        e,
        o: journalOutcome(e, horses[e.horseId]?.raceHistory, day),
      })),
    [journal, horses, day],
  );
  const filtered = rows.filter(
    ({ e, o }) =>
      (horseFilter === "all" || e.horseId === horseFilter) &&
      (resultFilter === "all" ||
        (resultFilter === "won" && o.status === "run" && o.position === 1) ||
        (resultFilter === "placed" && o.status === "run" && o.position <= 3) ||
        (resultFilter === "lost" && o.status === "run" && o.position > 3) ||
        (resultFilter === "pending" && o.status === "pending")),
  );

  const runs = rows.filter((r) => r.o.status === "run").map((r) => r.o) as Extract<
    JournalOutcome,
    { status: "run" }
  >[];
  const wins = runs.filter((r) => r.position === 1).length;
  const places = runs.filter((r) => r.position <= 3).length;
  const earned = runs.reduce((s, r) => s + r.earned, 0);

  const byStyle = useMemo(() => {
    const m: Record<string, { runs: number; wins: number }> = {};
    for (const { e, o } of rows) {
      if (o.status !== "run" || !e.ridingStyle) continue;
      const v = (m[e.ridingStyle] ??= { runs: 0, wins: 0 });
      v.runs++;
      if (o.position === 1) v.wins++;
    }
    return Object.entries(m);
  }, [rows]);

  const setJournal = (fn: (l: StrategyJournalEntry[] | undefined) => StrategyJournalEntry[]) =>
    useGame.setState((s) => ({ strategyJournal: fn(s.strategyJournal) }));

  const addManual = () => {
    const h = horses[newHorse];
    if (!h || !newPlan.trim()) return;
    const r = newRace !== "none" ? races[newRace] : undefined;
    setJournal((l) =>
      addJournalEntry(l, {
        createdDay: day,
        horseId: h.id,
        horseName: h.name,
        raceId: r?.id,
        raceName: r?.name,
        raceDay: r?.day,
        plan: newPlan.trim(),
      }),
    );
    setNewPlan("");
    toast.success("Plan added to your journal.");
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black font-[family-name:var(--font-display)] text-cream">
          Strategy Journal
        </h1>
        <p className="text-sm text-muted-foreground">
          Record each race plan, see how it turned out, and note what you learned. Plans from the{" "}
          <Link to="/race-advisor" className="text-gold hover:underline">
            Race Advisor
          </Link>{" "}
          can be saved here with one click.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ["Plans", journal.length],
          ["Raced", runs.length],
          ["Wins", wins],
          ["Win rate", runs.length ? `${Math.round((wins / runs.length) * 100)}%` : "—"],
          ["Placed (top 3)", places],
        ].map(([l, v]) => (
          <Card key={String(l)}>
            <CardContent className="p-4">
              <div className="text-xs uppercase text-muted-foreground">{l}</div>
              <div className="text-xl font-mono font-black">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Prize money from journaled races: ${Math.round(earned).toLocaleString()}
        {byStyle.length > 0 &&
          " · By riding style: " + byStyle.map(([k, v]) => `${k} ${v.wins}/${v.runs}`).join(", ")}
      </p>

      <PlanEffectivenessCard journal={journal} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wide">Write a plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Select
              value={newHorse}
              onValueChange={(v) => {
                setNewHorse(v);
                setNewRace("none");
              }}
            >
              <SelectTrigger className="w-56" aria-label="Horse">
                <SelectValue placeholder="Choose a horse" />
              </SelectTrigger>
              <SelectContent>
                {myHorses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newRace} onValueChange={setNewRace}>
              <SelectTrigger className="w-72" aria-label="Race">
                <SelectValue placeholder="Race (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No race</SelectItem>
                {raceOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Day {r.day} · {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <textarea
            aria-label="Plan"
            className={textareaCls}
            placeholder="What's the plan, and why?"
            value={newPlan}
            onChange={(e) => setNewPlan(e.target.value)}
          />
          <Button onClick={addManual} disabled={!newHorse || !newPlan.trim()}>
            Add to journal
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Select value={horseFilter} onValueChange={setHorseFilter}>
          <SelectTrigger className="w-56" aria-label="Filter by horse">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All horses</SelectItem>
            {Array.from(new Map(journal.map((e) => [e.horseId, e.horseName]))).map(([id, n]) => (
              <SelectItem key={id} value={id}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-44" aria-label="Filter by result">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="placed">Top 3</SelectItem>
            <SelectItem value="lost">Unplaced</SelectItem>
            <SelectItem value="pending">Upcoming</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No journal entries yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ e, o }) => (
            <JournalCard key={e.id} e={e} o={o} setJournal={setJournal} />
          ))}
        </div>
      )}
    </div>
  );
}

function JournalCard({
  e,
  o,
  setJournal,
}: {
  e: StrategyJournalEntry;
  o: JournalOutcome;
  setJournal: (fn: (l: StrategyJournalEntry[] | undefined) => StrategyJournalEntry[]) => void;
}) {
  const [note, setNote] = useState(e.reflection ?? "");
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold">
            {e.horseName}
            {e.raceName && <span className="text-muted-foreground"> · {e.raceName}</span>}
            {e.raceDay !== undefined && (
              <span className="text-muted-foreground"> · day {e.raceDay}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <OutcomeBadge o={o} />
            {o.status === "run" && o.earned > 0 && (
              <Badge variant="outline">${Math.round(o.earned).toLocaleString()}</Badge>
            )}
          </div>
        </div>
        {e.ridingStyle && (
          <div className="text-xs font-mono text-muted-foreground">
            {e.ridingStyle} · {e.earlyPosition} · move {e.moveTiming} · aggression{" "}
            {e.aggressiveness}/100 · confidence {e.confidence}%
          </div>
        )}
        <p className="text-sm">{e.plan}</p>
        {e.result && (
          <div className="rounded-md border border-border p-2 text-xs font-mono">
            Result: {e.result.position === 1 ? "Won" : `finished ${e.result.position}`}
            {e.result.fieldSize ? ` of ${e.result.fieldSize}` : ""} · prize money $
            {Math.round(e.result.prizeMoney).toLocaleString()}
            {e.result.beyer ? ` · speed figure ${e.result.beyer}` : ""} · cash after $
            {e.result.cashAfter.toLocaleString()} · recorded day {e.result.filledDay}
          </div>
        )}
        <div className="text-xs text-muted-foreground">Written on day {e.createdDay}</div>
        <Input
          aria-label="Reflection"
          placeholder="What did you learn?"
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          onBlur={() => setJournal((l) => updateJournalEntry(l, e.id, { reflection: note }))}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setJournal((l) => removeJournalEntry(l, e.id))}
        >
          Delete
        </Button>
      </CardContent>
    </Card>
  );
}
