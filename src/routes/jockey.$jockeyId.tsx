import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/game/store";
import { useMemo } from "react";
import type { GameState } from "@/game/types";
import { JockeyCard } from "@/components/jockey/JockeyCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonRaceHistoryTab } from "@/components/person/PersonRaceHistoryTab";
import { ChevronLeft, User, History, Sparkles } from "lucide-react";
import { formatJockeyTrait } from "@/core/common/traitLabels";
import type { JockeyTrait } from "@/core/jockey/types";
import {
  TRAIT_XP_UNLOCK_THRESHOLD,
  TRAIT_XP_MAINTENANCE_THRESHOLD,
} from "@/core/jockey/traitProgression";

export const Route = createFileRoute("/jockey/$jockeyId")({
  component: JockeyPage,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-cream">Jockey not found</h1>
      <Link to="/jockeys" className="text-gold underline mt-4 block">
        Back to Jockeys
      </Link>
    </div>
  ),
});

function JockeyPage() {
  const { jockeyId } = Route.useParams();
  const jockeys = useGameWithShallow((s: GameState) => s.jockeys);
  const hireJockey = useGame((s) => s.hireJockey);
  const hireApprentice = useGame((s) => s.hireApprentice);
  const releaseJockey = useGame((s) => s.releaseJockey);

  const jockeyMap = useMemo(() => new Map((jockeys ?? []).map((j) => [j.id, j])), [jockeys]);
  const jockey = jockeyMap.get(jockeyId);

  if (!jockey) {
    throw notFound();
  }

  const isRetained = !!jockey.contractUntil;
  const isApprentice = jockey.isApprentice;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <Link to="/jockeys">
          <Button variant="ghost" size="sm" className="text-cream-muted hover:text-cream">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Roster
          </Button>
        </Link>
        <BookmarkButton
          type="jockey"
          id={jockey.id}
          label={jockey.name}
          subtitle={isApprentice ? "Apprentice" : "Jockey"}
          variant="full"
        />
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Race History
          </TabsTrigger>
          <TabsTrigger value="traits" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Traits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <JockeyCard
                jockey={jockey}
                isRetained={isRetained}
                actionLabel={
                  isRetained ? "Release Jockey" : isApprentice ? "Hire Apprentice" : "Sign Retainer"
                }
                onAction={
                  isRetained
                    ? (j) => releaseJockey(j.id)
                    : isApprentice
                      ? (j) => hireApprentice(j.id)
                      : (j) => hireJockey(j.id, "retainer")
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <PersonRaceHistoryTab personId={jockey.id} roles={["jockey"]} />
        </TabsContent>

        <TabsContent value="traits">
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-gold/60" />
              <h2 className="text-lg font-bold text-cream uppercase tracking-tight">
                Trait Development
              </h2>
            </div>

            {(jockey.traits?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase text-cream/40 tracking-wide">
                  Active Traits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {jockey.traits.map((trait) => (
                    <Badge
                      key={trait}
                      variant="outline"
                      className="text-[10px] font-bold uppercase tracking-wider h-6 px-2.5 rounded-none border-gold/30 text-gold/80 bg-gold/5"
                    >
                      {formatJockeyTrait(trait)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {jockey.traitProgression && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-cream/40 tracking-wide">
                  Progression
                </h3>
                {Object.entries(jockey.traitProgression.xp).map(([traitKey, xp]) => {
                  const typedTraitKey = traitKey as JockeyTrait;
                  const isUnlocked = jockey.traits.includes(typedTraitKey);
                  const unlockDay = jockey.traitProgression!.unlockedAt[typedTraitKey];
                  const pct = Math.min(100, (xp / TRAIT_XP_UNLOCK_THRESHOLD) * 100);
                  return (
                    <div key={traitKey} className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className={isUnlocked ? "text-gold/80" : "text-cream/50"}>
                          {formatJockeyTrait(typedTraitKey)}
                        </span>
                        <span className="text-cream/40">
                          {xp} / {TRAIT_XP_UNLOCK_THRESHOLD} XP
                          {isUnlocked && unlockDay ? ` · Unlocked Day ${unlockDay}` : ""}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-sm overflow-hidden">
                        <div
                          className={isUnlocked ? "h-full bg-gold/60" : "h-full bg-blue-400/40"}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {!isUnlocked && xp < TRAIT_XP_MAINTENANCE_THRESHOLD && (
                        <div className="text-[8px] text-destructive/40 uppercase tracking-wide">
                          Atrophy Risk
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(jockey.traits?.length ?? 0) === 0 && !jockey.traitProgression && (
              <p className="text-sm text-cream/40 italic">
                No trait development yet. Race this jockey to earn trait XP.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
