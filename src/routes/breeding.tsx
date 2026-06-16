import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  FileText,
  Baby,
  Calendar,
  Target,
  ChevronRight,
  Users,
  BarChart2,
  Trophy,
  GitBranch,
} from "lucide-react";
import { NumericValue } from "@/components/horse/HorseBits";
import { cn } from "@/lib/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreedingProgramPanel } from "@/components/breeding/BreedingProgramPanel";
import { useBreedingPage } from "@/hooks/breeding/useBreedingPage";
import { BreedingShedTab } from "@/components/breeding/BreedingShedTab";
import { BroodmaresTab } from "@/components/breeding/BroodmaresTab";
import { BreedingHistoryTab } from "@/components/breeding/BreedingHistoryTab";
import { BreedingPedigreeTab } from "@/components/breeding/BreedingPedigreeTab";
import { BredHorsesTab } from "@/components/breeding/BredHorsesTab";
import { StallionsTab } from "@/components/breeding/StallionsTab";
import { SireWatchTab } from "@/components/breeding/SireWatchTab";
import { SireLeaderboardsTab } from "@/components/breeding/SireLeaderboardsTab";
import { useTabParam } from "@/hooks/ui/useTabParam";

const BREEDING_TABS = [
  "shed", "broodmares", "history", "bred", "pedigree", "programs",
  "stallions", "sire-watch", "sire-leaderboards",
] as const;

export const Route = createFileRoute("/breeding")({
  validateSearch: z.object({
    tab: z.enum(BREEDING_TABS).optional(),
  }),
  component: BreedingPage,
});

function BreedingPage() {
  const pageData = useBreedingPage();
  const { activePregnanciesCount, seasonOpen, nextSeasonStart } = pageData;
  const { tab, setTab } = useTabParam("shed", BREEDING_TABS);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-[family-name:var(--font-display)]">
            Breeding & Bloodstock
          </h1>
          <p className="text-cream-muted font-[family-name:var(--font-body)]">
            Manage your matings and track gestation for the next generation.
          </p>
        </div>
        <Badge
          className={cn(
            "font-[family-name:var(--font-mono)] tabular-nums",
            seasonOpen ? "bg-success text-t950" : "bg-t700 text-cream",
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as (typeof BREEDING_TABS)[number])} className="space-y-4">
        <TabsList>
          <TabsTrigger value="shed" className="gap-2">
            <Heart className="h-4 w-4" />
            Breeding Shed
          </TabsTrigger>
          <TabsTrigger value="broodmares" className="gap-2">
            <Baby className="h-4 w-4" />
            Broodmares{" "}
            {activePregnanciesCount > 0 && (
              <Badge className="ml-1 h-4 px-1 text-[10px] font-[family-name:var(--font-mono)] tabular-nums bg-t700 text-cream">
                {activePregnanciesCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <FileText className="h-4 w-4" />
            History
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
            Leaderboards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shed" className="space-y-4">
          <BreedingShedTab pageData={pageData} />
        </TabsContent>

        <TabsContent value="broodmares" className="space-y-4">
          <BroodmaresTab pageData={pageData} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <BreedingHistoryTab pageData={pageData} />
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

        <TabsContent value="stallions" className="space-y-4">
          <StallionsTab />
        </TabsContent>

        <TabsContent value="sire-watch" className="space-y-4">
          <SireWatchTab />
        </TabsContent>

        <TabsContent value="sire-leaderboards" className="space-y-4">
          <SireLeaderboardsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
