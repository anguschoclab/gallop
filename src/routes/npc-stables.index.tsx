// NPC Stables Directory - Browse rival stables and their horses
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, TrendingUp, Users, Building2, Search, X } from "lucide-react";
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
import { StableList } from "@/components/stable";
import { useNpcStablesFilters } from "@/hooks/stable/useNpcStablesFilters";

type NpcStablesSearch = {
  q: string;
  tier: string;
};

export const Route = createFileRoute("/npc-stables/")({
  validateSearch: (search: Record<string, unknown>): NpcStablesSearch => ({
    q: (search.q as string) || "",
    tier: (search.tier as string) || "all",
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
          {(search.q || search.tier !== "all") && (
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
            Smaller regional stables with limited strings. These operations may not appear in major
            races but provide depth to the racing ecosystem.
          </p>
        </div>
      )}
    </div>
  );
}
