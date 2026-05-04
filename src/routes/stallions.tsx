import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isStallionAvailable } from "@/core/breeding/stallions";
import type { Horse, Hemisphere } from "@/game/types";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";

export const Route = createFileRoute("/stallions")({
  component: StallionsPage,
});

function StallionsPage() {
  const horses = useGame((s) => s.horses);
  const npcStables = useGame((s) => s.npcStables);
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const breed = useGame((s) => s.breed);
  const pregnancies = useGame((s) => s.pregnancies);

  const [hemisphere, setHemisphere] = useState<Hemisphere | "all">("all");
  const [selectedMareId, setSelectedMareId] = useState<string>("");

  const stallions = horses.filter((h) => h.stud?.atStud);
  const filtered = stallions
    .filter((h) => hemisphere === "all" || h.hemisphere === hemisphere)
    .sort((a, b) => (a.stud!.standingFee - b.stud!.standingFee));

  // Player mares of breeding age, not currently pregnant
  const eligibleMares = horses.filter((h) =>
    h.owned &&
    (h.gender === "mare" || h.gender === "filly") &&
    h.age >= 3 &&
    !pregnancies.some((p) => !p.resolved && p.damId === h.id)
  );
  const selectedMare = eligibleMares.find((h) => h.id === selectedMareId);

  const stableNameFor = (stableId?: string): string => {
    if (!stableId) return "Owned";
    return npcStables.find((s) => s.id === stableId)?.name ?? "Unknown stable";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stallion Roster</h1>
        <p className="text-muted-foreground">
          Stallions standing at stud, sorted by fee. Book your mare to a stallion to schedule a foal.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Hemisphere</label>
            <Select value={hemisphere} onValueChange={(v) => setHemisphere(v as Hemisphere | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Northern">Northern</SelectItem>
                <SelectItem value="Southern">Southern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Your mare</label>
            <Select value={selectedMareId} onValueChange={setSelectedMareId}>
              <SelectTrigger><SelectValue placeholder="Select a mare to book…" /></SelectTrigger>
              <SelectContent>
                {eligibleMares.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} (age {m.age}, {m.hemisphere})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((stallion) => (
          <StallionCard
            key={stallion.id}
            stallion={stallion}
            stableName={stableNameFor(stallion.stableId)}
            day={day}
            mare={selectedMare}
            cash={cash}
            onBook={() => {
              if (!selectedMare) return;
              const result = breed(stallion.id, selectedMare.id, false);
              if (!result.ok) alert(result.reason);
            }}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">
            No stallions are currently standing at stud in the selected hemisphere.
          </p>
        )}
      </div>
    </div>
  );
}

function StallionCard({
  stallion,
  stableName,
  day,
  mare,
  cash,
  onBook,
}: {
  stallion: Horse;
  stableName: string;
  day: number;
  mare: Horse | undefined;
  cash: number;
  onBook: () => void;
}) {
  const stud = stallion.stud!;
  const available = isStallionAvailable(stallion, day);
  const inSeason = inBreedingSeason(day, stallion.hemisphere);
  const baseBookFee = 2000;
  const totalFee = baseBookFee + stud.standingFee;
  const canAfford = cash >= totalFee;
  const canBook =
    available &&
    !!mare &&
    mare.hemisphere === stallion.hemisphere &&
    canAfford;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{stallion.name}</CardTitle>
          <Badge variant="secondary">{stallion.hemisphere}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{stableName}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Standing fee</span>
          <span className="font-mono font-semibold">${stud.standingFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Book</span>
          <span>{stud.seasonBookings} / {stud.bookSize}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stakes foals</span>
          <span>{stud.lifetimeStakesFoals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">G1 foals</span>
          <span>{stud.lifetimeG1Foals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Age · Fame</span>
          <span>{stallion.age} · {stallion.fame}</span>
        </div>
        {!inSeason && (
          <p className="text-xs text-orange-600">Out of breeding season for {stallion.hemisphere}.</p>
        )}
        {stud.seasonBookings >= stud.bookSize && (
          <p className="text-xs text-orange-600">Book is full this season.</p>
        )}
        <Button size="sm" className="w-full mt-2" disabled={!canBook} onClick={onBook}>
          {!mare ? "Select a mare first" :
           mare.hemisphere !== stallion.hemisphere ? "Hemisphere mismatch" :
           !canAfford ? `Need $${totalFee.toLocaleString()}` :
           !available ? "Unavailable" :
           `Book — $${totalFee.toLocaleString()}`}
        </Button>
      </CardContent>
    </Card>
  );
}
