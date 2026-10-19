import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Heart,
  FileText,
  Baby,
  Calendar,
  Target,
  Users,
  BarChart2,
  Trophy,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { NumericValue } from "@/domains/horse/ui/HorseBits";
import { cn } from "@/shared/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { BreedingProgramPanel } from "@/domains/breeding/ui/BreedingProgramPanel";
import { useBreedingPage } from "@/domains/breeding/application/hooks/useBreedingPage";
import { BreedingShedTab } from "@/domains/breeding/ui/BreedingShedTab";
import { BroodmaresTab } from "@/domains/breeding/ui/BroodmaresTab";
import { BreedingHistoryTab } from "@/domains/breeding/ui/BreedingHistoryTab";
import { BreedingPedigreeTab } from "@/domains/breeding/ui/BreedingPedigreeTab";
import { BredHorsesTab } from "@/domains/breeding/ui/BredHorsesTab";
import { StallionsTab } from "@/domains/breeding/ui/StallionsTab";
import { SireWatchTab } from "@/domains/breeding/ui/SireWatchTab";
import { SireLeaderboardsTab } from "@/domains/breeding/ui/SireLeaderboardsTab";
import { DamsireLeaderboardTab } from "@/domains/breeding/ui/DamsireLeaderboardTab";
import { BlueHenLeaderboardTab } from "@/domains/breeding/ui/BlueHenLeaderboardTab";
import { SeasonPlannerTab } from "@/domains/breeding/ui/SeasonPlannerTab";
import { useTabParam } from "@/shared/hooks/ui/useTabParam";

const BREEDING_TABS = [
  "planner",
  "shed",
  "broodmares",
  "history",
  "bred",
  "pedigree",
  "programs",
  "stallions",
  "sire-watch",
  "sire-leaderboards",
  "damsire-leaderboard",
  "blue-hen-leaderboard",
] as const;

/**
 * Secondary tabs grouped under a single "Records & Sires" top-level tab so the
 * tab bar stays at seven visible triggers. All values remain valid `?tab=`
 * deep links — selecting the group opens a nested tab list.
 */
const RECORDS_TABS: readonly (typeof BREEDING_TABS)[number][] = [
  "history",
  "stallions",
  "sire-watch",
  "sire-leaderboards",
  "damsire-leaderboard",
  "blue-hen-leaderboard",
];

export const Route = createFileRoute("/breeding")({
  validateSearch: z.object({
    tab: z.enum(BREEDING_TABS).optional(),
  }),
  component: BreedingPage,
});

function BreedingPage() {
  const pageData = useBreedingPage();
  const { activePregnanciesCount, seasonOpen, nextSeasonStart } = pageData;
  const { tab, setTab } = useTabParam("planner", BREEDING_TABS);
  const topTab = (RECORDS_TABS as readonly string[]).includes(tab) ? "records" : tab;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            Breeding & Bloodstock
          </h1>
          <p className="text-muted-foreground font-[family-name:var(--font-body)]">
            Manage your matings and track gestation for the next generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/syndicate-stakes">
            <Button size="sm" variant="outline" className="border-white/10 text-foreground">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-400" />
              Syndicate Stakes
            </Button>
          </Link>
          <Badge
            className={cn(
              "font-[family-name:var(--font-mono)] tabular-nums",
              seasonOpen ? "bg-success text-background" : "bg-muted text-foreground",
            )}
          >
            <Calendar className="h-3 w-3 mr-1" />
            {seasonOpen ? (
              "Season Open"
            ) : (
              <>
                Opens Day <NumericValue value={nextSeasonStart} />
              </>
            )}
          </Badge>
        </div>
      </div>

      <Tabs
        value={topTab}
        onValueChange={(v) => {
          if (v !== "records") setTab(v as (typeof BREEDING_TABS)[number]);
          else if (!(RECORDS_TABS as readonly string[]).includes(tab)) setTab("history");
        }}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="planner" className="gap-2">
            <Calendar className="h-4 w-4" />
            Season Planner
          </TabsTrigger>
          <TabsTrigger value="shed" className="gap-2">
            <Heart className="h-4 w-4" />
            Classic Shed
          </TabsTrigger>
          <TabsTrigger value="broodmares" className="gap-2">
            <Baby className="h-4 w-4" />
            Broodmares{" "}
            {activePregnanciesCount > 0 && (
              <Badge className="ml-1 h-4 px-1 text-[10px] font-[family-name:var(--font-mono)] tabular-nums bg-muted text-foreground">
                {activePregnanciesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bred" className="gap-2">
            <Baby className="h-4 w-4" />
            Bred Horses
          </TabsTrigger>
          <TabsTrigger value="pedigree" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Pedigree
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <Target className="h-4 w-4" />
            Programs
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2">
            <Trophy className="h-4 w-4" />
            Records &amp; Sires
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="space-y-4">
          <SeasonPlannerTab />
        </TabsContent>

        <TabsContent value="shed" className="space-y-4">
          <BreedingShedTab pageData={pageData} />
        </TabsContent>

        <TabsContent value="broodmares" className="space-y-4">
          <BroodmaresTab pageData={pageData} />
        </TabsContent>

        <TabsContent value="bred" className="space-y-4">
          <BredHorsesTab />
        </TabsContent>

        <TabsContent value="pedigree" className="space-y-4">
          <BreedingPedigreeTab pageData={pageData} />
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <BreedingProgramPanel />
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as (typeof BREEDING_TABS)[number])}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="history" className="gap-2">
                <FileText className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="stallions" className="gap-2">
                <Users className="h-4 w-4" />
                Stallions
              </TabsTrigger>
              <TabsTrigger value="sire-watch" className="gap-2">
                <BarChart2 className="h-4 w-4" />
                Sire Watch
              </TabsTrigger>
              <TabsTrigger value="sire-leaderboards" className="gap-2">
                <Trophy className="h-4 w-4" />
                Sire Leaderboards
              </TabsTrigger>
              <TabsTrigger value="damsire-leaderboard" className="gap-2">
                <Heart className="h-4 w-4" />
                Broodmare Sires
              </TabsTrigger>
              <TabsTrigger value="blue-hen-leaderboard" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Blue Hens
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-4">
              <BreedingHistoryTab pageData={pageData} />
            </TabsContent>

            <TabsContent value="stallions" className="space-y-4">
              <StallionsTab />
            </TabsContent>

            <TabsContent value="sire-watch" className="space-y-4">
              <SireWatchTab />
            </TabsContent>

            <TabsContent value="sire-leaderboards" className="space-y-4">
              <SireLeaderboardsTab />
            </TabsContent>

            <TabsContent value="damsire-leaderboard" className="space-y-4">
              <DamsireLeaderboardTab />
            </TabsContent>

            <TabsContent value="blue-hen-leaderboard" className="space-y-4">
              <BlueHenLeaderboardTab />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
