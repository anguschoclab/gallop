import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useGame, useGameWithShallow } from "@/platform/game/store";
import { useMemo } from "react";
import type { GameState } from "@/platform/game/types";
import { JockeyCard } from "@/domains/jockey/ui/JockeyCard";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { BookmarkButton } from "@/domains/bookmarks/ui/BookmarkButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { PersonRaceHistoryTab } from "@/domains/person/ui/PersonRaceHistoryTab";
import { PersonProfileHero } from "@/domains/person/ui/PersonProfileHero";
import { PortraitRandomizeButton } from "@/domains/person/ui/PortraitRandomizeButton";
import { ChevronLeft, User, History, Sparkles } from "lucide-react";
import { formatJockeyTrait } from "@/domains/genetics/application/traitLabels";
import type { JockeyTrait } from "@/domains/jockey/application/jockeyFacade";
import { getJockeyName } from "@/domains/jockey/model/jockeyPerson";
import {
  TRAIT_XP_UNLOCK_THRESHOLD,
  TRAIT_XP_MAINTENANCE_THRESHOLD,
} from "@/domains/jockey/application/jockeyFacade";

export const Route = createFileRoute("/jockey/$jockeyId")({
  component: JockeyPage,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">Jockey not found</h1>
      <Link to="/jockeys" className="text-primary underline mt-4 block">
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
  const rerollJockeyAppearance = useGame((s) => s.rerollJockeyAppearance);
  const day = useGame((s) => s.day);

  const jockeyMap = useMemo(() => new Map((jockeys ?? []).map((j) => [j.id, j])), [jockeys]);
  const jockey = jockeyMap.get(jockeyId);

  if (!jockey) {
    throw notFound();
  }

  const isRetained = !!jockey.contractUntil;
  const isApprentice = jockey.isApprentice;
  const canReroll = jockey.stableId === "player" || jockey.stableId === "player_academy";

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <Link to="/jockeys">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Roster
          </Button>
        </Link>
        <BookmarkButton
          type="jockey"
          id={jockey.id}
          label={getJockeyName(jockey)}
          subtitle={isApprentice ? "Apprentice" : "Jockey"}
          variant="full"
        />
      </div>

      <PersonProfileHero
        identity={jockey.person}
        role="jockey"
        context="jockey-racewear"
        silk={jockey.silk}
        day={day}
        subtitle={isApprentice ? "Apprentice Jockey" : "Jockey"}
      >
        <PortraitRandomizeButton
          onClick={() => rerollJockeyAppearance(jockey.id)}
          allowed={canReroll}
          deniedReason="Only jockeys retained by your stable can be rerolled."
        />
      </PersonProfileHero>

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
              {isRetained && (
                <div className="mt-4 flex justify-center">
                  <PortraitRandomizeButton
                    onClick={() => rerollJockeyAppearance(jockey.id)}
                    allowed={canReroll}
                    deniedReason="Only jockeys retained by your stable can be rerolled."
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <PersonRaceHistoryTab personId={jockey.id} roles={["jockey"]} />
        </TabsContent>

        <TabsContent value="traits">
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary/60" />
              <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">
                Trait Development
              </h2>
            </div>

            {(jockey.traits?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black uppercase text-foreground/40 tracking-wide">
                  Active Traits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {jockey.traits.map((trait) => (
                    <Badge
                      key={trait}
                      variant="outline"
                      className="text-[10px] font-bold uppercase tracking-wider h-6 px-2.5 rounded-none border-primary/30 text-primary/80 bg-primary/5"
                    >
                      {formatJockeyTrait(trait)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {jockey.traitProgression && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-foreground/40 tracking-wide">
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
                        <span className={isUnlocked ? "text-primary/80" : "text-foreground/50"}>
                          {formatJockeyTrait(typedTraitKey)}
                        </span>
                        <span className="text-foreground/40">
                          {xp} / {TRAIT_XP_UNLOCK_THRESHOLD} XP
                          {isUnlocked && unlockDay ? ` · Unlocked Day ${unlockDay}` : ""}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-sm overflow-hidden">
                        <div
                          className={isUnlocked ? "h-full bg-primary/60" : "h-full bg-blue-400/40"}
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
              <p className="text-sm text-foreground/40 italic">
                No trait development yet. Race this jockey to earn trait XP.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
