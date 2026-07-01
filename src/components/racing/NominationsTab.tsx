import { useMemo, useState } from "react";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";
import { Link } from "@tanstack/react-router";
import {
  calculateNominationFee,
  getNominationTier,
  getRaceGrade,
  type NominationRecord,
  type NominationTier,
} from "@/core/racing/nominationFees";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Flag, Trophy, Lock } from "lucide-react";

const TIER_COLORS: Record<NominationTier, string> = {
  early: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  standard: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  late: "bg-red-500/20 text-red-300 border-red-400/40",
};

const GRADE_COLORS: Record<"G1" | "G2" | "G3", string> = {
  G1: "bg-gold/20 text-gold border-gold/50",
  G2: "bg-cream/20 text-cream border-cream/40",
  G3: "bg-bronze/20 text-bronze border-bronze/40",
};

export function NominationsTab() {
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const races = useGame((s: GameState) => s.races);
  const horses = useGame((s: GameState) => s.horses);
  const noms = useGame((s: GameState) => (s as any).playerNominations ?? []) as NominationRecord[];
  const nominateHorse = useGame((s: any) => s.nominateHorse);
  const withdrawNomination = useGame((s: any) => s.withdrawNomination);

  const playerHorses = useMemo(
    () => horses.filter((h) => h.owned && !h.retired && !h.deathDate),
    [horses],
  );

  const gradedRaces = useMemo(
    () =>
      races
        .filter((r) => getRaceGrade(r) && r.day > day && !r.resolved)
        .sort((a, b) => a.day - b.day)
        .slice(0, 60),
    [races, day],
  );

  const activeNoms = noms.filter((n) => n.status !== "scratched");
  const paidTotal = activeNoms.reduce((sum, n) => sum + n.feePaid, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-cream-muted uppercase tracking-wide">Active</div>
            <div className="text-2xl font-bold text-cream">{activeNoms.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-cream-muted uppercase tracking-wide">Fees committed</div>
            <div className="text-2xl font-bold text-gold">${paidTotal.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-cream-muted uppercase tracking-wide">Cash on hand</div>
            <div className="text-2xl font-bold text-cream">${cash.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-gold" /> Upcoming graded races
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {gradedRaces.length === 0 ? (
            <div className="text-cream-muted text-sm">No upcoming graded stakes on the calendar.</div>
          ) : (
            gradedRaces.map((race) => (
              <RaceNominationRow
                key={race.id}
                race={race}
                day={day}
                playerHorses={playerHorses}
                noms={noms}
                onNominate={(horseId) => {
                  const result = nominateHorse(horseId, race.id);
                  if (!result?.ok) toast.error(result?.reason ?? "Nomination failed");
                  else toast.success("Nomination submitted");
                }}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" /> My nominations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {noms.length === 0 ? (
            <div className="text-cream-muted text-sm">
              No nominations yet. Nominate early to lock in the cheapest fees.
            </div>
          ) : (
            noms
              .slice()
              .sort((a, b) => a.raceDay - b.raceDay)
              .map((n) => {
                const horse = horses.find((h) => h.id === n.horseId);
                return (
                  <div
                    key={n.id}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-cream/10 bg-broadcast-panel px-3 py-2"
                  >
                    <Badge className={`border ${GRADE_COLORS[n.grade]}`}>{n.grade}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="text-cream font-medium truncate">
                        {horse?.name ?? n.horseId} — {n.raceName}
                      </div>
                      <div className="text-xs text-cream-muted">
                        Day {n.raceDay} · nominated day {n.nominatedDay}
                      </div>
                    </div>
                    <Badge className={`border capitalize ${TIER_COLORS[n.tier]}`}>{n.tier}</Badge>
                    <div className="text-gold text-sm font-semibold">
                      ${n.feePaid.toLocaleString()}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        n.status === "entered"
                          ? "text-emerald-300 border-emerald-400/40"
                          : n.status === "scratched"
                            ? "text-cream-muted line-through"
                            : "text-cream border-cream/30"
                      }
                    >
                      {n.status}
                    </Badge>
                    {n.status === "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => withdrawNomination(n.id)}
                      >
                        Withdraw
                      </Button>
                    )}
                    <Link
                      to="/race/$raceId"
                      params={{ raceId: n.raceId }}
                      className="text-xs text-gold hover:underline"
                    >
                      View
                    </Link>
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RaceNominationRow({
  race,
  day,
  playerHorses,
  noms,
  onNominate,
}: {
  race: any;
  day: number;
  playerHorses: any[];
  noms: NominationRecord[];
  onNominate: (horseId: string) => void;
}) {
  const [pickedHorse, setPickedHorse] = useState<string>("");
  const grade = getRaceGrade(race)!;
  const daysOut = race.day - day;
  const tier = getNominationTier(daysOut);
  const fee = calculateNominationFee(grade, tier);
  const nominatedIds = new Set(
    noms.filter((n) => n.raceId === race.id && n.status !== "scratched").map((n) => n.horseId),
  );
  const eligible = playerHorses.filter((h) => !nominatedIds.has(h.id));

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-cream/10 bg-broadcast-panel px-3 py-2">
      <Badge className={`border ${GRADE_COLORS[grade]}`}>{grade}</Badge>
      <div className="flex-1 min-w-0">
        <div className="text-cream font-medium truncate">{race.name}</div>
        <div className="text-xs text-cream-muted">
          Day {race.day} · {daysOut}d out · purse ${race.purse.toLocaleString()}
        </div>
      </div>
      <Badge className={`border capitalize ${TIER_COLORS[tier]}`}>{tier}</Badge>
      <div className="text-sm font-semibold min-w-[80px] text-right">
        {fee != null ? (
          <span className="text-gold">${fee.toLocaleString()}</span>
        ) : (
          <span className="text-red-400 flex items-center gap-1 justify-end">
            <Lock className="h-3 w-3" /> closed
          </span>
        )}
      </div>
      {fee != null && eligible.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={pickedHorse} onValueChange={setPickedHorse}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Pick horse" />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!pickedHorse}
            onClick={() => {
              onNominate(pickedHorse);
              setPickedHorse("");
            }}
          >
            Nominate
          </Button>
        </div>
      )}
      {nominatedIds.size > 0 && (
        <Badge variant="outline" className="text-emerald-300 border-emerald-400/40">
          {nominatedIds.size} nominated
        </Badge>
      )}
    </div>
  );
}
