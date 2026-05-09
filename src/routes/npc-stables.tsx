// NPC Stables Directory - Browse rival stables and their horses
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, TrendingUp, Users, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNpcStables } from "@/game/hooks/useSystemsState";
import { getMajorStables, getStablesByTier } from "@/core/stable/stableQueries";
import { getTierColor, getReputationStars } from "@/core/stable/uiHelpers";

export const Route = createFileRoute("/npc-stables")({ component: NpcStablesPage });

function NpcStablesPage() {
  const npcStables = useNpcStables();

  const majorStables = getMajorStables(npcStables);
  const eliteStables = getStablesByTier(majorStables, "elite");
  const midStables = getStablesByTier(majorStables, "mid");
  const budgetStables = getStablesByTier(majorStables, "budget");
  const fillerCount = npcStables.filter((s) => !s.isMajor).length;

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2 font-[family-name:var(--font-display)]">
          <Building2 className="w-8 h-8 text-gold" />
          Rival Stables
        </h1>
        <p className="text-cream-muted mt-2 font-[family-name:var(--font-body)]">
          Browse {npcStables.length} NPC stables worldwide — from elite international operations to
          regional breeders.
        </p>
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
      </div>

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
