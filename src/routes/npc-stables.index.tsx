// NPC Stables Directory - Browse rival stables and their horses
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Trophy, TrendingUp, Users, Building2, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNpcStables } from "@/game/hooks/useSystemsState";
import { getMajorStables, getStablesByTier } from "@/core/stable/stableQueries";
import { getTierColor, getReputationStars } from "@/core/stable/uiHelpers";
import { useMemo } from "react";

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
  const { q, tier } = Route.useSearch();
  const navigate = useNavigate();
  const npcStables = useNpcStables();

  const majorStables = useMemo(() => getMajorStables(npcStables), [npcStables]);

  const filteredStables = useMemo(() => {
    return majorStables.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.owner.toLowerCase().includes(q.toLowerCase());
      const matchesTier = tier === "all" || s.tier === tier;
      return matchesSearch && matchesTier;
    });
  }, [majorStables, q, tier]);

  const eliteStables = getStablesByTier(filteredStables, "elite");
  const midStables = getStablesByTier(filteredStables, "mid");
  const budgetStables = getStablesByTier(filteredStables, "budget");
  const fillerCount = npcStables.filter((s) => !s.isMajor).length;

  const updateFilter = (key: keyof NpcStablesSearch, value: string) => {
    (navigate as any)({
      search: (prev: any) => ({ ...prev, [key]: value }),
    });
  };

  const clearFilters = () => {
    (navigate as any)({
      search: (prev: any) => ({ q: "", tier: "all" }),
    });
  };

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
              value={q}
              onChange={(e) => updateFilter("q", e.target.value)}
            />
          </div>
          <Select value={tier} onValueChange={(v) => updateFilter("tier", v)}>
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
          {(q || tier !== "all") && (
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
          {/* Elite Stables */}
          {eliteStables.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-display)]">
                <Trophy className="w-5 h-5 text-gold" />
                Elite Stables
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eliteStables.map((stable) => (
                  <StableCard key={stable.id} stable={stable} />
                ))}
              </div>
            </div>
          )}

          {/* Mid-Tier Stables */}
          {midStables.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-display)]">
                <TrendingUp className="w-5 h-5 text-gold" />
                Mid-Tier Stables
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {midStables.map((stable) => (
                  <StableCard key={stable.id} stable={stable} />
                ))}
              </div>
            </div>
          )}

          {/* Budget Stables */}
          {budgetStables.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-display)]">
                <Users className="w-5 h-5 text-gold" />
                Budget Stables
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {budgetStables.map((stable) => (
                  <StableCard key={stable.id} stable={stable} />
                ))}
              </div>
            </div>
          )}
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

function StableCard({ stable }: { stable: ReturnType<typeof getMajorStables>[number] }) {
  return (
    <Link to="/npc-stables/$stableId" params={{ stableId: stable.id }}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full border-gold-muted">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full border-2"
                style={{
                  backgroundColor: stable.colors.primary,
                  borderColor: stable.colors.secondary,
                }}
              />
              <div>
                <CardTitle className="text-lg font-[family-name:var(--font-display)]">
                  {stable.name}
                </CardTitle>
                <p className="text-sm text-cream-muted">{stable.country}</p>
              </div>
            </div>
            <Badge className={getTierColor(stable.tier)}>{stable.tier}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-cream-muted mb-3 line-clamp-2">
            {stable.description ||
              `${stable.owner}'s racing operation with ${stable.horses.length} horses.`}
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-cream-muted">{stable.horses.length} horses</span>
            <span className="text-fame" title={`Reputation: ${stable.reputation}`}>
              {getReputationStars(stable.reputation)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
