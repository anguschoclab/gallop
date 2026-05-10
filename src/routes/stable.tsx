import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useHorses } from "@/game/hooks/useCoreState";
import { useAwards, useNpcStables } from "@/game/hooks/useSystemsState";
import { HorseCard } from "@/components/HorseCard";
import { TrophyCase } from "@/components/awards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NumericValue } from "@/components/HorseBits";
import { formatCurrency } from "@/lib/formatting";
import { Building2, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stable")({
  component: StablePage,
});

function StablePage() {
  const horses = useHorses();
  const awards = useAwards();
  const npcStables = useNpcStables();

  const myHorses = useMemo(() => horses.filter((h) => h.owned), [horses]);
  const playerAwards = useMemo(() => awards.filter((a) => !a.stableId), [awards]);
  const allHorses = horses;

  // Pre-calculate horse counts by stable to replace an O(n^2) nested loop with O(n) map lookup
  const horseCountsByStable = useMemo(() => {
    const counts = new Map<string, number>();
    allHorses.forEach((h) => {
      if (h.stableId) {
        counts.set(h.stableId, (counts.get(h.stableId) || 0) + 1);
      }
    });
    return counts;
  }, [allHorses]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Stables
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-mono)] tabular-nums">
          <NumericValue value={myHorses.length} /> horses in training
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/stallions">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
                Stallions at Stud
              </CardTitle>
              <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                View available stallions for breeding
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/jockeys">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
                Jockeys
              </CardTitle>
              <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                Manage your jockey roster
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/horse-gallery">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
                Horse Gallery
              </CardTitle>
              <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                View your horses in a gallery format
              </p>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/scheduler">
          <Card className="hover:bg-t700 transition-colors border-gold-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-cream font-[family-name:var(--font-display)]">
                Campaign Scheduler
              </CardTitle>
              <p className="text-xs text-cream-muted font-[family-name:var(--font-body)]">
                Plan race campaigns for your horses
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Tabs defaultValue="roster" className="space-y-4">
        <TabsList>
          <TabsTrigger value="roster" className="gap-2">
            <Users className="h-4 w-4" />
            My Stable
          </TabsTrigger>
          <TabsTrigger value="rivals" className="gap-2">
            <Building2 className="h-4 w-4" />
            Rival Stables
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-4">
          {playerAwards.length > 0 && <TrophyCase awards={playerAwards} variant="compact" />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myHorses.map((h) => (
              <Link key={h.id} to="/stable/$horseId" params={{ horseId: h.id }}>
                <HorseCard horse={h} variant="full" />
              </Link>
            ))}
            {myHorses.length === 0 && (
              <Card className="col-span-full border-gold-muted">
                <CardContent className="p-8 text-center text-cream-muted italic font-[family-name:var(--font-body)]">
                  Empty stalls, restless ambition. Visit the auction to recruit your first champion.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rivals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {npcStables.map((stable) => {
              const stableHorseCount = horseCountsByStable.get(stable.id) || 0;
              return (
                <Link
                  key={stable.id}
                  to="/npc-stables/$stableId"
                  params={{ stableId: stable.id }}
                  className="group"
                >
                  <Card className="hover:bg-t700 hover:border-gold transition-colors border-gold-muted cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-[family-name:var(--font-display)] group-hover:text-gold transition-colors">
                            {stable.name}
                          </CardTitle>
                          <p className="text-xs text-cream-muted capitalize font-[family-name:var(--font-body)]">
                            {stable.personality} strategy
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-cream-muted group-hover:text-gold transition-colors shrink-0 mt-1" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-cream-muted font-[family-name:var(--font-body)]">
                          <NumericValue value={stableHorseCount} /> horses
                        </span>
                        <Badge
                          className={cn(
                            "font-[family-name:var(--font-mono)] tabular-nums bg-t700 text-cream",
                          )}
                        >
                          {formatCurrency(stable.cash)}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-cream-muted mt-2 group-hover:text-gold transition-colors">
                        View roster →
                      </p>
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
