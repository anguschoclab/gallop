import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { HorseCard } from "@/components/HorseCard";
import { HorseCompare } from "@/components/HorseCompare";
import { TrophyCase } from "@/components/awards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users } from "lucide-react";

export const Route = createFileRoute("/stable")({
  component: StablePage,
});

function StablePage() {
  const myHorses = useGame((s) => s.horses.filter(h => h.owned));
  const awards = useGame((s) => s.awards ?? []);
  const playerAwards = awards.filter((a) => !a.stableId);
  const npcStables = useGame((s) => s.npcStables);
  const allHorses = useGame((s) => s.horses);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stable Management</h1>
          <p className="text-muted-foreground tabular-nums">{myHorses.length} horses in training</p>
        </div>
        {myHorses.length >= 2 && <HorseCompare horses={myHorses} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/stallions">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Stallions at Stud</CardTitle>
              <p className="text-xs text-muted-foreground">View available stallions for breeding</p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/jockeys">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Jockeys</CardTitle>
              <p className="text-xs text-muted-foreground">Manage your jockey roster</p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/horse-gallery">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Horse Gallery</CardTitle>
              <p className="text-xs text-muted-foreground">View your horses in a gallery format</p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/scheduler">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Campaign Scheduler</CardTitle>
              <p className="text-xs text-muted-foreground">Plan race campaigns for your horses</p>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster" className="gap-2">
            <Users className="h-4 w-4" />
            Active Roster
          </TabsTrigger>
          <TabsTrigger value="rivals" className="gap-2">
            <Building2 className="h-4 w-4" />
            Rival Stables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
          {playerAwards.length > 0 && (
            <TrophyCase
              awards={playerAwards}
              variant="compact"
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myHorses.map((h) => (
              <Link key={h.id} to="/stable/$horseId" params={{ horseId: h.id }}>
                <HorseCard horse={h} variant="full" />
              </Link>
            ))}
            {myHorses.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground italic">
                  No horses currently in training. Visit the market or auction to acquire stock.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rivals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {npcStables.map((stable) => {
              const stableHorses = allHorses.filter(h => h.stableId === stable.id);
              return (
                <Link key={stable.id} to="/npc-stables/$stableId" params={{ stableId: stable.id }}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{stable.name}</CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">{stable.personality} strategy</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">{stableHorses.length} horses</span>
                        <Badge variant="secondary" className="tabular-nums">${stable.cash.toLocaleString()}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
