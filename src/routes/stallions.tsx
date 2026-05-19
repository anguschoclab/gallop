import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
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
import { isStallionAvailable } from "@/core/breeding/stallions";
import type { Horse, Hemisphere, GameState } from "@/game/types";
import { inBreedingSeason } from "@/core/calendar/breedingCalendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { calculateRecommendedStudFee } from "@/core/breeding/stallions";

export const Route = createFileRoute("/stallions")({
  component: StallionsPage,
});

function StallionsPage() {
  const horses = (useGame as any)((s: GameState) => s.horses, shallow);
  const npcStables = (useGame as any)((s: GameState) => s.npcStables, shallow);
  const day = useGame((s: GameState) => s.day);
  const cash = useGame((s: GameState) => s.cash);
  const breed = useGame((s) => s.breed);
  const updateStudFee = useGame((s) => s.updateStudFee);
  const pregnancies = (useGame as any)((s: GameState) => s.pregnancies, shallow);

  const [hemisphere, setHemisphere] = useState<Hemisphere | "all">("all");
  const [selectedMareId, setSelectedMareId] = useState<string>("");

  const stallions = horses.filter((h: Horse) => h.stud?.atStud);
  const myStallions = stallions.filter((h: Horse) => h.owned);
  const rosterStallions = stallions.filter((h: Horse) => !h.owned || h.stableId === undefined); // Show all public ones

  const filtered = stallions
    .filter((h: Horse) => hemisphere === "all" || h.hemisphere === hemisphere)
    .sort((a: Horse, b: Horse) => a.stud!.standingFee - b.stud!.standingFee);

  // Player mares of breeding age, not currently pregnant
  const eligibleMares = horses.filter(
    (h: Horse) =>
      h.owned &&
      (h.gender === "mare" || h.gender === "filly") &&
      h.age >= 3 &&
      !pregnancies.some((p: any) => !p.resolved && p.damId === h.id),
  );
  const selectedMare = eligibleMares.find((h: Horse) => h.id === selectedMareId);

  const stableNameFor = (stableId?: string): string => {
    if (!stableId) return "Owned";
    return npcStables.find((s: any) => s.id === stableId)?.name ?? "Unknown stable";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Stallion Roster
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Manage your own stallions and book covers with elite sires.
        </p>
      </div>

      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-t900/50">
          <TabsTrigger value="roster">Stallion Roster</TabsTrigger>
          <TabsTrigger value="manage">My Stallions ({myStallions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-6 mt-6">
          <Card className="border-gold-muted">
            <CardHeader>
              <CardTitle className="text-cream font-[family-name:var(--font-display)]">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-cream-muted">Hemisphere</label>
                <Select
                  value={hemisphere}
                  onValueChange={(v) => setHemisphere(v as Hemisphere | "all")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="Northern">Northern</SelectItem>
                    <SelectItem value="Southern">Southern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-cream-muted">Your mare</label>
                <Select value={selectedMareId} onValueChange={setSelectedMareId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a mare to book…" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleMares.map((m: Horse) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} (age {m.age}, {m.hemisphere})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((stallion: Horse) => (
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
              <p className="text-sm text-cream-muted col-span-full">
                No stallions are currently standing at stud in the selected hemisphere.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myStallions.map((stallion: Horse) => (
              <MyStallionCard
                key={stallion.id}
                stallion={stallion}
                day={day}
                recommendedFee={calculateRecommendedStudFee(stallion, {
                  horses,
                  npcStables,
                } as any)}
                onUpdateFee={(fee) => {
                  const result = updateStudFee(stallion.id, fee);
                  if (!result.ok) alert(result.reason);
                }}
              />
            ))}
            {myStallions.length === 0 && (
              <p className="text-sm text-cream-muted col-span-full">
                You don't have any stallions at stud. Retire a colt or horse to stud from their
                stable page.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MyStallionCard({
  stallion,
  day,
  recommendedFee,
  onUpdateFee,
}: {
  stallion: Horse;
  day: number;
  recommendedFee: number;
  onUpdateFee: (fee: number) => void;
}) {
  const [feeInput, setFeeInput] = useState(stallion.stud!.standingFee.toString());
  const stud = stallion.stud!;

  return (
    <Card className="border-gold">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-cream font-[family-name:var(--font-display)]">
              {stallion.name}
            </CardTitle>
            <p className="text-xs text-gold">Player Owned</p>
          </div>
          <Badge className="bg-t700 text-cream">{stallion.hemisphere}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-cream-muted text-xs">Season Bookings</span>
            <span className="text-cream font-mono">
              {stud.seasonBookings} / {stud.bookSize}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-cream-muted text-xs">Stakes / G1 Foals</span>
            <span className="text-cream font-mono">
              {stud.lifetimeStakesFoals} / {stud.lifetimeG1Foals}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <label className="text-xs text-cream-muted">Standing Fee</label>
            <button
              className="text-[10px] text-gold hover:underline"
              onClick={() => {
                setFeeInput(recommendedFee.toString());
                onUpdateFee(recommendedFee);
              }}
            >
              Apply Recommended: ${recommendedFee.toLocaleString()}
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted">$</span>
              <Input
                className="pl-6 bg-t900/50 border-gold-muted text-cream"
                type="number"
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="border-gold text-gold hover:bg-gold hover:text-t900"
              onClick={() => onUpdateFee(parseInt(feeInput) || 0)}
            >
              Update
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const canBook = available && !!mare && mare.hemisphere === stallion.hemisphere && canAfford;

  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-cream font-[family-name:var(--font-display)]">
            {stallion.name}
          </CardTitle>
          <Badge className="bg-t700 text-cream">{stallion.hemisphere}</Badge>
        </div>
        <p className="text-xs text-cream-muted">{stableName}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-cream-muted">Standing fee</span>
          <span className="font-mono font-semibold tabular-nums text-cream">
            ${stud.standingFee.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Book</span>
          <span className="text-cream">
            {stud.seasonBookings} / {stud.bookSize}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Stakes foals</span>
          <span className="text-cream">{stud.lifetimeStakesFoals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">G1 foals</span>
          <span className="text-cream">{stud.lifetimeG1Foals}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-muted">Age · Fame</span>
          <span className="text-cream">
            {stallion.age} · {stallion.fame}
          </span>
        </div>
        {!inSeason && (
          <p className="text-xs text-warning">Out of breeding season for {stallion.hemisphere}.</p>
        )}
        {stud.seasonBookings >= stud.bookSize && (
          <p className="text-xs text-warning">Book is full this season.</p>
        )}
        <Button size="sm" className="w-full mt-2" disabled={!canBook} onClick={onBook}>
          {!mare
            ? "Select a mare first"
            : mare.hemisphere !== stallion.hemisphere
              ? "Hemisphere mismatch"
              : !canAfford
                ? `Need $${totalFee.toLocaleString()}`
                : !available
                  ? "Unavailable"
                  : `Book — $${totalFee.toLocaleString()}`}
        </Button>
      </CardContent>
    </Card>
  );
}
