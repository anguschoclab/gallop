// NPC Stables Directory - Browse rival stables and their horses
import { createFileRoute } from "@tanstack/react-router";
import {
  Trophy,
  TrendingUp,
  Users,
  Building2,
  Search,
  X,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoutingInsightsPanel } from "@/components/insights/ScoutingInsightsPanel";
import { ScoutingAssignmentsPanel } from "@/components/insights/ScoutingAssignmentsPanel";
import { StableList } from "@/components/stable";
import { StableCompareBar } from "@/components/stable/StableCompareBar";
import {
  useNpcStablesFilters,
  CASH_PRESSURE_FILTERS,
  NPC_STABLE_SORTS,
} from "@/hooks/stable/useNpcStablesFilters";

type NpcStablesSearch = {
  q: string;
  tier: string;
  pressure: string;
  sort: string;
};

export const Route = createFileRoute("/npc-stables/")({
  validateSearch: (search: Record<string, unknown>): NpcStablesSearch => ({
    q: (search.q as string) || "",
    tier: (search.tier as string) || "all",
    pressure: (search.pressure as string) || "all",
    sort: (search.sort as string) || "name",
  }),
  component: NpcStablesPage,
});

function NpcStablesPage() {
  const search = Route.useSearch();
  const {
    npcStables,
    filteredStables,
    eliteStables,
    midStables,
    budgetStables,
    fillerCount,
    updateFilter,
    clearFilters,
  } = useNpcStablesFilters(search);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 font-[family-name:var(--font-display)]">
            <Building2 className="w-8 h-8 text-gold" />
            Rival Stables
          </h1>
          <p className="text-cream-muted mt-2 font-[family-name:var(--font-body)]">
            Browse {npcStables.length} NPC stables worldwide — from elite international operations
            to regional breeders.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-cream-muted" />
            <Input
              placeholder="Search stables..."
              className="pl-8 h-9 text-sm"
              value={search.q}
              onChange={(e) => updateFilter("q", e.target.value)}
            />
          </div>
          <Select value={search.tier} onValueChange={(v) => updateFilter("tier", v)}>
            <SelectTrigger className="h-9 w-32 text-sm">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="elite">Elite</SelectItem>
              <SelectItem value="mid">Mid-Tier</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
            </SelectContent>
          </Select>
          <Select value={search.pressure} onValueChange={(v) => updateFilter("pressure", v)}>
            <SelectTrigger className="h-9 w-44 text-sm" aria-label="Filter by cash pressure">
              <SelectValue placeholder="Any cash pressure" />
            </SelectTrigger>
            <SelectContent>
              {CASH_PRESSURE_FILTERS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.sort} onValueChange={(v) => updateFilter("sort", v)}>
            <SelectTrigger className="h-9 w-52 text-sm" aria-label="Sort stables">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {NPC_STABLE_SORTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search.q ||
            search.tier !== "all" ||
            search.pressure !== "all" ||
            search.sort !== "name") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1 text-cream-muted hover:text-cream"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mt-3 text-sm text-cream-muted">
        <span className="flex items-center gap-1">
          <Trophy className="w-4 h-4" />
          {eliteStables.length} Elite
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          {midStables.length} Mid-Tier
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {budgetStables.length} Budget
        </span>
        <span className="flex items-center gap-1">
          <Building2 className="w-4 h-4" />
          {fillerCount} Regional Operations
        </span>
      </div>

      <Tabs defaultValue="directory" className="space-y-6">
        <TabsList className="bg-slate-900/40 h-10 gap-2">
          <TabsTrigger value="directory" className="gap-2 text-xs uppercase tracking-widest px-5">
            <Building2 className="w-3.5 h-3.5" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2 text-xs uppercase tracking-widest px-5">
            <BarChart3 className="w-3.5 h-3.5" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2 text-xs uppercase tracking-widest px-5">
            <ClipboardList className="w-3.5 h-3.5" />
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-8 mt-0 focus-visible:outline-none">
          {filteredStables.length === 0 ? (
            <Card className="border-dashed border-gold-muted">
              <CardContent className="p-12 text-center text-cream-muted font-[family-name:var(--font-body)]">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No stables match your current filters.</p>
                <Button variant="link" className="text-gold mt-2" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <StableList
                title="Elite Stables"
                icon={<Trophy className="w-5 h-5 text-gold" />}
                stables={eliteStables}
              />
              <StableList
                title="Mid-Tier Stables"
                icon={<TrendingUp className="w-5 h-5 text-gold" />}
                stables={midStables}
              />
              <StableList
                title="Budget Stables"
                icon={<Users className="w-5 h-5 text-gold" />}
                stables={budgetStables}
              />
            </>
          )}

          {/* Regional Operations (Filler) - Collapsible */}
          {fillerCount > 0 && (
            <div className="mt-8 pt-6 border-t">
              <h2 className="text-lg font-semibold text-cream-muted flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {fillerCount} Regional Operations
              </h2>
              <p className="text-sm text-cream-muted mt-1">
                Smaller regional stables with limited strings. These operations may not appear in
                major races but provide depth to the racing ecosystem.
              </p>
            </div>
          )}

          <StableCompareBar />
        </TabsContent>

        <TabsContent value="insights" className="mt-0 focus-visible:outline-none">
          <ScoutingInsightsPanel />
        </TabsContent>

        <TabsContent value="assignments" className="mt-0 focus-visible:outline-none">
          <ScoutingAssignmentsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
