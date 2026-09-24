import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Compass, Loader2 } from "lucide-react";
import { useGameSelector } from "@/hooks/shared/useGameSelector";
import { isPlayerOwned } from "@/services/horse/horseFacade";
import type { Horse, Race } from "@/game/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  recommendRaceStrategy,
  type RaceStrategyRecommendation,
} from "@/lib/raceStrategy.functions";

export const Route = createFileRoute("/race-strategy")({
  head: () => ({
    meta: [
      { title: "AI Race Strategy Advisor — Gallop" },
      { name: "description", content: "Get a personalized race plan for your horse's next start." },
      { property: "og:title", content: "AI Race Strategy Advisor — Gallop" },
      { property: "og:description", content: "Personalized race plans from your horse's profile and race details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RaceStrategyPage,
});

const STYLE_LABEL: Record<string, string> = {
  front_runner: "Front runner",
  stalker: "Stalker",
  closer: "Closer",
  tactical: "Tactical",
  lead: "Lead",
  press: "Press the pace",
  midpack: "Midpack",
  drop_back: "Drop back",
  early: "Far turn",
  mid: "In the stretch",
  late: "Final furlongs",
};

function describeHorse(h: Horse): string {
  const s = h.stats;
  return [
    `Name: ${h.name} (${h.age}yo ${h.gender})`,
    `Stats: speed ${s.speed}, stamina ${s.stamina}, acceleration ${s.acceleration}, consistency ${s.consistency}, temperament ${s.temperament}`,
    `Running style: ${h.runningStyle}`,
    `Best distance: ~${h.distanceAptitude}m`,
    `Surface aptitude: turf ${h.surfaceAptitude.Turf}, dirt ${h.surfaceAptitude.Dirt}, synthetic ${h.surfaceAptitude.Synthetic}`,
    `Weather preference: ${h.weatherPreference ?? "all"}`,
    `Energy ${Math.round(h.energy)}, form ${Math.round(h.form)}, fitness ${Math.round(h.fitness)}, fatigue ${Math.round(h.fatigue)}`,
    `Career: ${h.careerStarts} starts, ${h.careerWins} wins${h.lastBeyer ? `, last speed figure ${h.lastBeyer}` : ""}`,
  ].join("\n");
}

function describeRace(r: Race, horses: Record<string, Horse>, horseId: string, day: number): string {
  const rivals = r.entries
    .filter((e) => e.horseId !== horseId)
    .map((e) => horses[e.horseId])
    .filter(Boolean)
    .slice(0, 14)
    .map((h) => `- ${h.name}: ${h.runningStyle}, speed ${h.stats.speed}, stamina ${h.stats.stamina}`);
  return [
    `Race: ${r.name} (${r.graded?.grade ?? r.raceClass})`,
    `In ${r.day - day} days · ${r.distance}m on ${r.surface ?? r.graded?.surface ?? "Dirt"}`,
    `Track: ${r.graded?.track ?? r.trackId ?? "unknown"}, turns ${r.handedness ?? "unknown"}`,
    `Going: ${r.trackCondition ?? "fast"}, weather: ${r.weather ?? "clear"}`,
    `Field size: ${r.fieldSize}, purse ${r.purse}`,
    rivals.length ? `Known rivals:\n${rivals.join("\n")}` : "Rivals not yet declared",
  ].join("\n");
}

function RaceStrategyPage() {
  const { horses, races, day } = useGameSelector((s) => ({
    horses: s.horses,
    races: s.races,
    day: s.day,
  }));
  const myHorses = useMemo(
    () => Object.values(horses).filter((h) => isPlayerOwned(h) && !h.retired),
    [horses],
  );
  const upcoming = useMemo(
    () =>
      Object.values(races)
        .filter((r) => !r.resolved && !r.cancelled && r.day >= day)
        .sort((a, b) => a.day - b.day),
    [races, day],
  );

  const [horseId, setHorseId] = useState("");
  const [raceId, setRaceId] = useState("");
  const [horseText, setHorseText] = useState("");
  const [raceText, setRaceText] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<RaceStrategyRecommendation | null>(null);

  const entered = useMemo(
    () => (horseId ? upcoming.filter((r) => r.entries.some((e) => e.horseId === horseId)) : []),
    [upcoming, horseId],
  );
  const raceOptions = entered.length ? entered : upcoming.slice(0, 60);

  useEffect(() => {
    const h = horses[horseId];
    if (h) setHorseText(describeHorse(h));
  }, [horseId, horses]);
  useEffect(() => {
    const r = races[raceId];
    if (r) setRaceText(describeRace(r, horses, horseId, day));
  }, [raceId, races, horses, horseId, day]);

  const advise = useServerFn(recommendRaceStrategy);
  const submit = async () => {
    setLoading(true);
    setError(null);
    setRec(null);
    try {
      const res = await advise({ data: { horse: horseText, race: raceText, notes } });
      if (res.ok) setRec(res.recommendation);
      else setError(res.error);
    } catch {
      setError("Couldn't reach the strategy advisor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectClass =
    "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Race Strategy Advisor
        </h1>
        <p className="text-cream-muted">
          Pick a horse and an upcoming race, adjust the details if you like, and get a tailored race plan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horse & race</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Horse</span>
              <select className={selectClass} value={horseId} onChange={(e) => setHorseId(e.target.value)}>
                <option value="">Choose a horse…</option>
                {myHorses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <Textarea
              rows={8}
              value={horseText}
              onChange={(e) => setHorseText(e.target.value)}
              placeholder="Horse profile — pick a horse above or describe one"
            />
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">
                Upcoming race{entered.length ? " (races this horse is entered in)" : ""}
              </span>
              <select className={selectClass} value={raceId} onChange={(e) => setRaceId(e.target.value)}>
                <option value="">Choose a race…</option>
                {raceOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.distance}m · in {r.day - day}d
                  </option>
                ))}
              </select>
            </label>
            <Textarea
              rows={7}
              value={raceText}
              onChange={(e) => setRaceText(e.target.value)}
              placeholder="Race details — pick a race above or describe one"
            />
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your notes (optional) — e.g. 'bumped at the start last time', 'must win for the Derby'"
            />
            <Button onClick={submit} disabled={loading || !horseText.trim() || !raceText.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Compass className="mr-2 h-4 w-4" />}
              {loading ? "Working out a plan…" : "Recommend strategy"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommended plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {error && <p className="text-destructive">{error}</p>}
            {!rec && !error && !loading && (
              <p className="text-muted-foreground">Your race plan will appear here.</p>
            )}
            {loading && <p className="text-muted-foreground animate-pulse">Studying the form…</p>}
            {rec && (
              <>
                <p className="text-foreground">{rec.summary}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Riding style", STYLE_LABEL[rec.ridingStyle]],
                    ["Early position", STYLE_LABEL[rec.earlyPosition]],
                    ["Make the move", STYLE_LABEL[rec.moveTiming]],
                    ["Aggressiveness", `${rec.aggressiveness}/100`],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-md border border-border p-3">
                      <div className="text-xs text-muted-foreground">{k}</div>
                      <div className="font-semibold text-foreground">{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-foreground">Why</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {rec.keyFactors.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-foreground">Watch out for</h3>
                  <ul className="list-disc space-y-1 pl-5">
                    {rec.risks.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 font-semibold text-foreground">Jockey instructions</h3>
                  <p>{rec.jockeyNotes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
