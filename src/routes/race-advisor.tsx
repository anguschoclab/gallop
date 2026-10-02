import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGame } from "@/game/store";
import { isPlayerOwned } from "@/core/horse/ownership";
import { adviseRace, adviceToInstructions } from "@/core/tactics/raceAdvisor";
import type { Horse } from "@/game/types";

export const Route = createFileRoute("/race-advisor")({
  head: () => ({
    meta: [
      { title: "Race Advisor — Stable Strategy" },
      {
        name: "description",
        content:
          "Get a tailored race plan for your horse based on its profile, the conditions and the rival field.",
      },
      { property: "og:title", content: "Race Advisor — Stable Strategy" },
      {
        property: "og:description",
        content: "Tailored race plans from your stable's own race analyst.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RaceAdvisorPage,
});

const STYLE_LABEL = {
  front_runner: "Front Runner",
  stalker: "Stalker",
  closer: "Closer",
  tactical: "Tactical",
} as const;
const POS_LABEL = {
  lead: "Lead",
  press: "Press",
  midpack: "Mid-pack",
  drop_back: "Drop back",
} as const;
const MOVE_LABEL = { early: "Early", mid: "Mid-race", late: "Late" } as const;

function RaceAdvisorPage() {
  const horses = useGame((s) => s.horses);
  const races = useGame((s) => s.races);
  const day = useGame((s) => s.day);
  const setRaceTactics = useGame((s) => s.setRaceTactics);

  const myHorses = useMemo(
    () =>
      Object.values(horses).filter(
        (h) => isPlayerOwned(h) && h.lifecycleStatus === "active" && h.racingViable,
      ),
    [horses],
  );
  const [horseId, setHorseId] = useState<string>("");
  const [raceId, setRaceId] = useState<string>("");
  const horse = horseId ? horses[horseId] : undefined;

  const upcoming = useMemo(() => {
    const list = Object.values(races).filter((r) => !r.resolved && !r.cancelled && r.day >= day);
    const entered = horse ? list.filter((r) => r.entries.some((e) => e.horseId === horse.id)) : [];
    return (entered.length ? entered : list).sort((a, b) => a.day - b.day).slice(0, 60);
  }, [races, day, horse]);
  const race = raceId ? races[raceId] : undefined;
  const isEntered = !!(race && horse && race.entries.some((e) => e.horseId === horse.id));

  const rivals = useMemo<Horse[]>(
    () =>
      race && horse
        ? race.entries
            .filter((e) => e.horseId !== horse.id)
            .map((e) => horses[e.horseId])
            .filter(Boolean)
        : [],
    [race, horse, horses],
  );
  const advice = useMemo(
    () => (horse && race ? adviseRace(horse, race, rivals) : null),
    [horse, race, rivals],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Race Advisor
        </h1>
        <p className="text-cream-muted">
          Your race analyst studies the horse, the trip, the going and the rivals, then suggests a
          plan.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          value={horseId}
          onValueChange={(v) => {
            setHorseId(v);
            setRaceId("");
          }}
        >
          <SelectTrigger>
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
        <Select value={raceId} onValueChange={setRaceId} disabled={!horse}>
          <SelectTrigger>
            <SelectValue placeholder="Choose an upcoming race" />
          </SelectTrigger>
          <SelectContent>
            {upcoming.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                Day {r.day} · {r.name} · {r.distance}m{r.graded ? ` · ${r.graded.grade}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {myHorses.length === 0 && (
        <p className="text-cream-muted">You have no active racehorses yet.</p>
      )}

      {advice && horse && race && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                Plan for {horse.name}
                <Badge variant="secondary">
                  {advice.outlook === "strong"
                    ? "Favourite on paper"
                    : advice.outlook === "competitive"
                      ? "Competitive"
                      : "Outsider"}
                </Badge>
                <Badge variant="outline">Confidence {advice.confidence}%</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Riding style" value={STYLE_LABEL[advice.ridingStyle]} />
                <Stat label="Early position" value={POS_LABEL[advice.earlyPosition]} />
                <Stat label="Make the move" value={MOVE_LABEL[advice.moveTiming]} />
                <Stat label="Aggression" value={`${advice.aggressiveness}/100`} />
              </div>
              <div className="rounded-md border border-border p-3 text-sm">
                <div className="mb-1 text-xs uppercase text-muted-foreground">
                  Jockey instructions
                </div>
                {advice.jockeyNotes}
              </div>
              {isEntered ? (
                <Button
                  onClick={() => {
                    setRaceTactics(
                      race.id,
                      horse.id,
                      adviceToInstructions(advice, horse.id, race.id),
                    );
                    toast.success("Plan sent to the jockey.");
                  }}
                >
                  Apply plan to this entry
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Enter {horse.name} in this race to send the plan to the jockey.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pace map</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                {rivals.length} rivals entered, {advice.fieldEarlySpeed} with early speed.
              </p>
              <p className="text-muted-foreground">
                {advice.fieldEarlySpeed >= 3
                  ? "Expect a fast, contested early pace."
                  : advice.fieldEarlySpeed === 0
                    ? "Expect a slow, uncontested pace."
                    : "Expect an even pace."}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Why this plan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {advice.reasons.length ? (
                  advice.reasons.map((r) => <li key={r}>{r}</li>)
                ) : (
                  <li>No standout edges — ride to the horse's natural style.</li>
                )}
              </ul>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Risks to watch</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {advice.risks.length ? (
                  advice.risks.map((r) => <li key={r}>{r}</li>)
                ) : (
                  <li>No major concerns.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
