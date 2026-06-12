import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/breeding")({
  component: BreedingPage,
});

function BreedingPage() {
  const pageData = useBreedingPage();
  const { activePregnanciesCount, seasonOpen, nextSeasonStart } = pageData;

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

      <div className="flex flex-wrap gap-3">
        <Link to="/stallions">
          <Button
            variant="outline"
            className="h-10 px-5 gap-2 border-gold/30 text-cream hover:bg-gold/10 hover:border-gold/60 hover:text-gold transition-all font-[family-name:var(--font-display)] text-sm font-semibold"
          >
            <Users className="h-4 w-4 text-gold/60" />
            Stallions at Stud
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          </Button>
        </Link>
        <Link to="/sire-watch">
          <Button
            variant="outline"
            className="h-10 px-5 gap-2 border-gold/30 text-cream hover:bg-gold/10 hover:border-gold/60 hover:text-gold transition-all font-[family-name:var(--font-display)] text-sm font-semibold"
          >
            <BarChart2 className="h-4 w-4 text-gold/60" />
            Sire Watch
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          </Button>
        </Link>
        <Link to="/sire-leaderboards">
          <Button
            variant="outline"
            className="h-10 px-5 gap-2 border-gold/30 text-cream hover:bg-gold/10 hover:border-gold/60 hover:text-gold transition-all font-[family-name:var(--font-display)] text-sm font-semibold"
          >
            <Trophy className="h-4 w-4 text-gold/60" />
            Sire Leaderboards
            <ChevronRight className="h-3.5 w-3.5 opacity-40" />
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="shed" className="space-y-4">
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
          <TabsTrigger value="pedigree" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Pedigree
          </TabsTrigger>
          <TabsTrigger value="programs" className="gap-2">
            <Target className="h-4 w-4" />
            Programs
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

        <TabsContent value="pedigree" className="space-y-4">
          <BreedingPedigreeTab pageData={pageData} />
        </TabsContent>

        <TabsContent value="programs" className="space-y-4">
          <BreedingProgramPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
