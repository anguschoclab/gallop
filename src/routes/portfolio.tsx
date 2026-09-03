import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Briefcase, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import { formatCurrency } from "@/core/common/formatting";
import {
  buildStablePortfolios,
  portfolioTotals,
  sortPortfolios,
  type PortfolioSortKey,
} from "@/core/stable/portfolio";
import { getPrestigeTier } from "@/core/prestige/prestigeTypes";
import { StatCard } from "@/components/common/StatCard";
import { PillToggleGroup } from "@/components/common/PillToggleGroup";
import { PortfolioTable } from "@/components/portfolio/PortfolioTable";

const SORT_KEYS = [
  "name",
  "netWorth",
  "cash",
  "horseCount",
  "horseValue",
  "syndicateValue",
  "prestige",
  "lifetimeEarnings",
] as const;

const TIERS = ["all", "player", "elite", "mid", "budget"] as const;
const PRESTIGE_FILTERS = ["all", "world", "premier", "national", "regional", "provincial"] as const;

export const Route = createFileRoute("/portfolio")({
  validateSearch: z.object({
    q: z.string().optional(),
    tier: z.enum(TIERS).optional(),
    prestige: z.enum(PRESTIGE_FILTERS).optional(),
    sort: z.enum(SORT_KEYS).optional(),
    dir: z.enum(["asc", "desc"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Portfolio — Stable Holdings & Prestige" },
      {
        name: "description",
        content:
          "Compare every stable's cash, bloodstock, syndicate stakes and prestige in one sortable holdings table.",
      },
      { property: "og:title", content: "Portfolio — Stable Holdings & Prestige" },
      {
        property: "og:description",
        content: "League-wide holdings: cash, horses, syndicate stakes and prestige per stable.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PortfolioPage,
});

function PortfolioPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const q = search.q ?? "";
  const tier = search.tier ?? "all";
  const prestige = search.prestige ?? "all";
  const sortKey: PortfolioSortKey = search.sort ?? "netWorth";
  const sortDir = search.dir ?? "desc";

  const horses = useGameWithShallow((s: GameState) => s.horses);
  const npcStables = useGameWithShallow((s: GameState) => s.npcStables ?? []);
  const syndicates = useGameWithShallow((s: GameState) => s.syndicates ?? {});
  const cash = useGame((s: GameState) => s.cash);
  const playerProfile = useGameWithShallow((s: GameState) => s.playerProfile);
  const reputationScore = useGame((s: GameState) => s.reputation?.score ?? 0);

  const rows = useMemo(
    () =>
      buildStablePortfolios({
        playerName: playerProfile?.stableName ?? "My Stable",
        playerOwnerName: playerProfile?.ownerName ?? "You",
        playerCash: cash,
        playerPrestige: reputationScore,
        playerCountry: playerProfile?.country,
        horses: Object.values(horses),
        npcStables,
        syndicates,
      }),
    [horses, npcStables, syndicates, cash, playerProfile, reputationScore],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !`${r.name} ${r.owner}`.toLowerCase().includes(needle)) return false;
      if (tier === "player" && !r.isPlayer) return false;
      if (tier !== "all" && tier !== "player" && r.tier !== tier) return false;
      if (prestige !== "all" && getPrestigeTier(r.prestige) !== prestige) return false;
      return true;
    });
  }, [rows, q, tier, prestige]);

  const sorted = useMemo(
    () => sortPortfolios(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );
  const totals = useMemo(() => portfolioTotals(filtered), [filtered]);
  const playerRow = rows.find((r) => r.isPlayer);
  const playerRank = playerRow
    ? sortPortfolios(rows, "netWorth", "desc").findIndex((r) => r.isPlayer) + 1
    : 0;

  function setSearch(patch: Record<string, unknown>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  function handleSort(key: PortfolioSortKey) {
    if (key === sortKey) {
      setSearch({ dir: sortDir === "desc" ? "asc" : "desc" });
    } else {
      setSearch({ sort: key, dir: key === "name" ? "asc" : "desc" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-primary uppercase tracking-wide text-xs font-bold opacity-70">
          <Briefcase className="h-3.5 w-3.5" />
          Holdings
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name:var(--font-display)]">
          Portfolio
        </h1>
        <p className="text-cream-muted font-[family-name:var(--font-body)]">
          Cash, bloodstock, syndicate stakes and prestige for every stable in the world
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Your Net Worth"
          value={formatCurrency(playerRow?.netWorth ?? 0)}
          sub={`Rank #${playerRank} of ${rows.length}`}
          size="xl"
        />
        <StatCard
          label="League Cash"
          value={formatCurrency(totals.cash)}
          sub={`${filtered.length} stables shown`}
          size="xl"
        />
        <StatCard
          label="League Bloodstock"
          value={formatCurrency(totals.horseValue)}
          sub={`${totals.horseCount} horses`}
          size="xl"
        />
        <StatCard
          label="Syndicate Capital"
          value={formatCurrency(totals.syndicateValue)}
          sub="Shares held at current price"
          size="xl"
        />
      </div>

      <Card className="border-white/5 bg-slate-900/40">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cream-muted" />
            <Input
              value={q}
              onChange={(e) => setSearch({ q: e.target.value })}
              placeholder="Search stable or owner"
              aria-label="Search stables"
              className="pl-8"
            />
          </div>
          <PillToggleGroup
            label="Tier"
            options={TIERS.map((t) => ({ value: t, label: t }))}
            value={tier}
            onChange={(v) => setSearch({ tier: v })}
          />
          <PillToggleGroup
            label="Prestige"
            options={PRESTIGE_FILTERS.map((p) => ({ value: p, label: p }))}
            value={prestige}
            onChange={(v) => setSearch({ prestige: v })}
          />
        </CardContent>
      </Card>

      <PortfolioTable rows={sorted} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
    </div>
  );
}
