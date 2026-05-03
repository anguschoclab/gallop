import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/breeding")({
  component: BreedingPage,
});

function BreedingPage() {
  const horses = useGame((s) => s.horses);
  const pregnancies = useGame((s) => s.pregnancies);
  const log = useGame((s) => s.log);
  const day = useGame((s) => s.day);
  const cash = useGame((s) => s.cash);
  const breed = useGame((s) => s.breed);
  const [sireId, setSireId] = useState<string>("");
  const [damId, setDamId] = useState<string>("");

  const adults = horses.filter((h) => h.age >= 3);
  const breedLogs = log.filter((l) => /Mated|Foal/.test(l.text));

  const onBreed = () => {
    if (!sireId || !damId || sireId === damId) return;
    breed(sireId, damId);
    setSireId(""); setDamId("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Breeding Shed</h1>
        <p className="text-muted-foreground">Mate two horses (age 3+). Foals arrive 30 days after conception. Fee $2,000.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>New Mating</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Sire</label>
              <select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={sireId} onChange={(e) => setSireId(e.target.value)}>
                <option value="">Select sire…</option>
                {adults.map((h) => <option key={h.id} value={h.id}>{h.name} (age {h.age})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Dam</label>
              <select className="w-full border rounded-md px-3 py-2 bg-background text-sm" value={damId} onChange={(e) => setDamId(e.target.value)}>
                <option value="">Select dam…</option>
                {adults.filter((h) => h.id !== sireId).map((h) => <option key={h.id} value={h.id}>{h.name} (age {h.age})</option>)}
              </select>
            </div>
          </div>
          <Button onClick={onBreed} disabled={!sireId || !damId || sireId === damId || cash < 2000}>
            <Heart className="h-4 w-4 mr-1" /> Breed ($2,000)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Active Pregnancies</CardTitle></CardHeader>
        <CardContent>
          {pregnancies.filter((p) => !p.resolved).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active pregnancies.</p>
          ) : (
            <div className="space-y-2">
              {pregnancies.filter((p) => !p.resolved).map((p) => (
                <div key={p.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                  <span>{p.sireName} × {p.damName}</span>
                  <Badge variant="secondary">Due day {p.dueDay} ({Math.max(0, p.dueDay - day)}d)</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Past Foals</CardTitle></CardHeader>
        <CardContent>
          {pregnancies.filter((p) => p.resolved).length === 0 ? (
            <p className="text-sm text-muted-foreground">No foals born yet.</p>
          ) : (
            <div className="space-y-2">
              {pregnancies.filter((p) => p.resolved).map((p) => {
                const foal = horses.find((h) => h.id === p.foalId);
                return (
                  <div key={p.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                    <span>{p.sireName} × {p.damName} → <span className="font-medium">{foal?.name ?? "(sold)"}</span></span>
                    <span className="text-muted-foreground">Born day {p.dueDay}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Breeding Log</CardTitle></CardHeader>
        <CardContent>
          {breedLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No breeding events yet.</p>
          ) : (
            <div className="space-y-1">
              {breedLogs.map((l, i) => (
                <div key={i} className="text-sm py-1 border-b last:border-0 flex gap-3">
                  <span className="text-muted-foreground tabular-nums shrink-0">D{l.day}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
