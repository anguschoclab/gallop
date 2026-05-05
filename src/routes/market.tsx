import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HorseStats, overall } from "@/components/HorseBits";
import { horsePrice } from "@/game/horseGen";
import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { HorsePortrait } from "@/components/HorsePortrait";

export const Route = createFileRoute("/market")({
  component: MarketPage,
});

function MarketPage() {
  const market = useGame((s) => s.market);
  const cash = useGame((s) => s.cash);
  const buyHorse = useGame((s) => s.buyHorse);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bloodstock Market</h1>
        <p className="text-muted-foreground">Private sales available for immediate acquisition. Roster refreshes daily.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {market.map((h) => {
          const price = horsePrice(h);
          return (
            <Card key={h.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <HorsePortrait coatColor={h.coatColor} size="sm" />
                  <div className="flex-1">
                    <p className="font-bold">{h.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Age {Math.floor(h.age)} · <JargonTooltip term="OVR">OVR</JargonTooltip> {overall(h)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-base tabular-nums">${price.toLocaleString()}</Badge>
                </div>
                <HorseStats horse={h} />
                <Button onClick={() => buyHorse(h.id)} disabled={cash < price} className="w-full" size="sm">
                  {cash < price ? "Insufficient funds" : "Acquire Horse"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {market.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center text-muted-foreground italic">
              No private offerings available at this time.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
