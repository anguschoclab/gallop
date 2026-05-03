import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState } from "react";
import { foalPreview, studFee } from "@/game/horseGen";
import { HorseStats, overall, SilkBadge } from "@/components/HorseBits";
import { toast } from "sonner";

export const Route = createFileRoute("/breeding")({
  component: BreedingPage,
});

function BreedingPage() {
  const horses = useGame((s) => s.horses);
  const studs = useGame((s) => s.studs);
  const cash = useGame((s) => s.cash);
  const day = useGame((s) => s.day);
  const breedHorse = useGame((s) => s.breedHorse);

  const mares = horses.filter((h) => h.sex === "F" && h.age >= 3 && !h.pregnancy);
  const ownedSires = horses.filter((h) => h.sex === "M" && h.age >= 3);
  const allSires = [
    ...ownedSires.map((h) => ({ horse: h, fee: 0, owned: true })),
    ...studs.map((h) => ({ horse: h, fee: h.studFee ?? studFee(h), owned: false })),
  ];

  const [damId, setDamId] = useState<string | undefined>(mares[0]?.id);
  const [sireId, setSireId] = useState<string | undefined>(allSires[0]?.horse.id);

  const dam = mares.find((m) => m.id === damId);
  const sire = allSires.find((s) => s.horse.id === sireId);
  const fee = sire?.fee ?? 0;
  const preview = useMemo(() => (dam && sire ? foalPreview(sire.horse, dam) : null), [dam, sire]);

  const pregnant = horses.filter((h) => h.pregnancy);

  const handleBreed = () => {
    if (!damId || !sireId) return;
    const res = breedHorse(damId, sireId);
    if (res.ok) toast.success("Mare bred successfully");
    else toast.error(res.reason ?? "Breeding failed");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Breeding</h1>
        <p className="text-muted-foreground">Pair a mare with a sire — foals arrive after 14 days, race-eligible at age 2.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Pair a breeding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">Mare (Dam)</label>
              <Select value={damId} onValueChange={setDamId}>
                <SelectTrigger><SelectValue placeholder="Pick a mare" /></SelectTrigger>
                <SelectContent>
                  {mares.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">No eligible mares</div>}
                  {mares.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} · OVR {overall(m)} · Pot {m.potential}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dam && (
                <div className="mt-3 p-3 rounded-lg border space-y-2">
                  <div className="flex items-center gap-2">
                    <SilkBadge color={dam.silk} />
                    <div className="flex-1">
                      <p className="font-medium">{dam.name}</p>
                      <p className="text-xs text-muted-foreground">Age {dam.age} · ♀</p>
                    </div>
                  </div>
                  <HorseStats horse={dam} />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground mb-1 block">Sire</label>
              <Select value={sireId} onValueChange={setSireId}>
                <SelectTrigger><SelectValue placeholder="Pick a sire" /></SelectTrigger>
                <SelectContent>
                  {allSires.map(({ horse, fee, owned }) => (
                    <SelectItem key={horse.id} value={horse.id}>
                      {horse.name} · Pot {horse.potential} · {owned ? "Owned" : `$${fee.toLocaleString()}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sire && (
                <div className="mt-3 p-3 rounded-lg border space-y-2">
                  <div className="flex items-center gap-2">
                    <SilkBadge color={sire.horse.silk} />
                    <div className="flex-1">
                      <p className="font-medium">{sire.horse.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Age {sire.horse.age} · ♂{sire.horse.publicStud ? " · Public stud" : " · Owned"}
                      </p>
                    </div>
                    {fee > 0 && <Badge variant="outline">${fee.toLocaleString()}</Badge>}
                  </div>
                  <HorseStats horse={sire.horse} />
                </div>
              )}
            </div>
          </div>

          {preview && (
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium mb-2">Expected foal</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <Stat label="Speed" value={preview.expectedStats.speed} />
                <Stat label="Stamina" value={preview.expectedStats.stamina} />
                <Stat label="Acceleration" value={preview.expectedStats.acceleration} />
                <Stat label="Consistency" value={preview.expectedStats.consistency} />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Stat range ±10 · Expected potential {preview.expectedPotential} · Foal arrives day {day + 14}
              </p>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!damId || !sireId || cash < fee}
            onClick={handleBreed}
          >
            Breed {fee > 0 ? `($${fee.toLocaleString()})` : "(Free)"}
          </Button>
        </CardContent>
      </Card>

      {pregnant.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Expecting</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pregnant.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                <SilkBadge color={m.silk} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Bred to {m.pregnancy?.sireName} · Due day {m.pregnancy?.dueDay}
                  </p>
                </div>
                <Badge variant="secondary">{(m.pregnancy?.dueDay ?? day) - day} days left</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Public studs</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {studs.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
              <SilkBadge color={s.silk} />
              <div className="flex-1">
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground">Age {s.age} · Pot {s.potential} · OVR {overall(s)}</p>
              </div>
              <Badge variant="outline">${(s.studFee ?? studFee(s)).toLocaleString()}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
