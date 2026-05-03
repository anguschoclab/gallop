import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HorseStats, overall, SilkBadge } from "@/components/HorseBits";

export const Route = createFileRoute("/stable")({
  component: StablePage,
});

function StablePage() {
  const horses = useGame((s) => s.horses);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Stable</h1>
        <p className="text-muted-foreground">{horses.length} horses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {horses.map((h) => (
          <Link key={h.id} to="/stable/$horseId" params={{ horseId: h.id }}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <SilkBadge color={h.silk} />
                  <div className="flex-1">
                    <p className="font-bold">{h.name}</p>
                    <p className="text-xs text-muted-foreground">Age {h.age} · OVR {overall(h)} · Pot {h.potential}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="secondary">⚡ {h.energy}</Badge>
                    {h.form !== 0 && (
                      <Badge variant={h.form > 0 ? "default" : "destructive"} className="text-xs">
                        {h.form > 0 ? "+" : ""}{h.form}
                      </Badge>
                    )}
                  </div>
                </div>
                <HorseStats horse={h} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
