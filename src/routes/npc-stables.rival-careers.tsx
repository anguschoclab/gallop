/**
 * npc-stables.rival-careers.tsx - Rival career comparison view
 *
 * Multi-select list of notable rival horses with a side-by-side career table
 * (age, starts, wins, earnings, fame, stage, milestone history). Candidates
 * can be narrowed by search, career stage, age, wins, starts, earnings and
 * fame, and sorted by any of those columns.
 *
 * Dependencies: @/hooks/game/useCoreState, @/hooks/game/useSystemsState,
 *   @/hooks/stable/useRivalCareerFilters, @/services/npc/npcFacade,
 *   @/components/stable/RivalCareerCompareTable
 * Related files: src/routes/npc-stables.compare.tsx (stable-level compare)
 */

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHorses, useDay } from "@/hooks/game/useCoreState";
import { useNpcStables } from "@/hooks/game/useSystemsState";
import { isPlayerOwned, getStableId, ensurePhenotypeResolved } from "@/services/horse/horseFacade";
import {
  isNotableRival,
  buildRivalCareerProfiles,
  careerStage,
  careerStageLabel,
} from "@/services/npc/npcFacade";
import { RivalCareerCompareTable } from "@/components/stable/RivalCareerCompareTable";
import { PillToggleGroup } from "@/components/common/PillToggleGroup";
import { FilterSelect } from "@/components/jockey/FilterSelect";
import {
  useRivalCareerFilters,
  type RivalCareerCandidate,
  type RivalCareerSortKey,
} from "@/hooks/stable/useRivalCareerFilters";
import { formatCurrency } from "@/lib/formatting";
import type { Horse } from "@/game/types";
import type { NpcCareerStage } from "@/core/horse/types";

const MAX_RIVAL_COMPARE = 4;

const SORT_OPTIONS: readonly { value: RivalCareerSortKey; label: string }[] = [
  { value: "fame", label: "Fame" },
  { value: "wins", label: "Wins" },
  { value: "earnings", label: "Earnings" },
  { value: "starts", label: "Starts" },
  { value: "age", label: "Age" },
  { value: "name", label: "Name" },
];

const STAGE_KEYS: NpcCareerStage[] = [
  "unraced",
  "juvenile",
  "rising",
  "prime",
  "declining",
  "veteran",
  "retired",
];

const STAGE_OPTIONS = [
  { value: "all", label: "Any stage" },
  ...STAGE_KEYS.map((s) => ({ value: s, label: careerStageLabel(s) })),
];

const AGE_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "2", label: "2yo" },
  { value: "3", label: "3yo" },
  { value: "4", label: "4yo" },
  { value: "5", label: "5yo" },
  { value: "6", label: "6yo" },
  { value: "7+", label: "7yo+" },
];

const WINS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "1", label: "1+" },
  { value: "3", label: "3+" },
  { value: "5", label: "5+" },
  { value: "10", label: "10+" },
];

const STARTS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "1", label: "1+" },
  { value: "5", label: "5+" },
  { value: "10", label: "10+" },
  { value: "20", label: "20+" },
];

const EARNINGS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "100000", label: "100k+" },
  { value: "250000", label: "250k+" },
  { value: "500000", label: "500k+" },
  { value: "1000000", label: "1M+" },
];

const FAME_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "25", label: "25+" },
  { value: "50", label: "50+" },
  { value: "75", label: "75+" },
];

export function NpcStablesRivalCareers() {
  const horses = useHorses();
  const day = useDay();
  const npcStables = useNpcStables();
  const [selected, setSelected] = useState<string[]>([]);

  const stableNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of npcStables ?? []) map[s.id] = s.name;
    return map;
  }, [npcStables]);

  const rivals = useMemo(() => {
    const list = Object.values(horses)
      .filter((h: Horse) => !isPlayerOwned(h) && !!getStableId(h))
      .map(ensurePhenotypeResolved)
      .filter(isNotableRival);
    return list.sort((a, b) => (b.fame ?? 0) - (a.fame ?? 0)).slice(0, 200);
  }, [horses]);

  const candidates = useMemo<RivalCareerCandidate[]>(() => {
    return rivals.map((h) => {
      const history = h.raceHistory ?? [];
      const sid = getStableId(h);
      return {
        id: h.id,
        name: h.name,
        stableId: sid ?? undefined,
        age: Math.floor(h.age),
        starts: history.length,
        wins: history.filter((e) => e.position === 1).length,
        earnings: Math.round(h.lifetimeEarnings ?? 0),
        fame: Math.round(h.fame ?? 0),
        stage: careerStage(h),
      };
    });
  }, [rivals]);

  const { filters, patch, filtered, reset, hasActiveFilters } = useRivalCareerFilters(candidates);
  const shown = filtered.slice(0, 40);

  const profiles = useMemo(() => {
    const byId = new Map(rivals.map((h) => [h.id, h]));
    const picked = selected.map((id) => byId.get(id)).filter((h): h is Horse => h !== undefined);
    return buildRivalCareerProfiles(picked, day);
  }, [selected, rivals, day]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_RIVAL_COMPARE
          ? prev
          : [...prev, id],
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] text-cream">
          Compare Rival Careers
        </h1>
        <p className="text-sm text-cream-muted mt-1">
          Select up to {MAX_RIVAL_COMPARE} notable rival horses to compare age, record, earnings,
          fame, career stage and milestone history.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Select Rivals</CardTitle>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <Input
              placeholder="Filter by name..."
              value={filters.search}
              onChange={(e) => patch({ search: e.target.value })}
              className="max-w-xs"
            />
            <PillToggleGroup
              label="Sort by"
              options={SORT_OPTIONS}
              value={filters.sort}
              onChange={(sort) => patch({ sort })}
              ariaLabel="Sort rival list"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={reset}>
                Reset filters
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 mb-3">
            <FilterSelect
              label="Stage"
              value={filters.stage}
              options={STAGE_OPTIONS}
              onChange={(stage) => patch({ stage })}
            />
            <FilterSelect
              label="Age"
              value={filters.age}
              options={AGE_OPTIONS}
              onChange={(age) => patch({ age })}
            />
            <FilterSelect
              label="Min wins"
              value={filters.minWins}
              options={WINS_OPTIONS}
              onChange={(minWins) => patch({ minWins })}
            />
            <FilterSelect
              label="Min starts"
              value={filters.minStarts}
              options={STARTS_OPTIONS}
              onChange={(minStarts) => patch({ minStarts })}
            />
            <FilterSelect
              label="Min earnings"
              value={filters.minEarnings}
              options={EARNINGS_OPTIONS}
              onChange={(minEarnings) => patch({ minEarnings })}
            />
            <FilterSelect
              label="Min fame"
              value={filters.minFame}
              options={FAME_OPTIONS}
              onChange={(minFame) => patch({ minFame })}
            />
          </div>
          <p className="text-xs text-cream-muted mb-2">
            Showing {shown.length} of {candidates.length} notable rivals.
          </p>
          <div className="space-y-2">
            {shown.map((c) => {
              const checked = selected.includes(c.id);
              const disabled = !checked && selected.length >= MAX_RIVAL_COMPARE;
              return (
                <label
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border border-border/50 p-2 hover:bg-card/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(c.id)}
                    aria-label={c.name}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm text-cream">{c.name}</span>
                  <span className="text-xs text-cream-muted">
                    {c.age}Y · {(c.stableId && stableNames[c.stableId]) || "Unattached"} ·{" "}
                    {careerStageLabel(c.stage as NpcCareerStage)} · {c.wins}W/{c.starts}S ·{" "}
                    {formatCurrency(c.earnings)} · Fame {c.fame}
                  </span>
                </label>
              );
            })}
            {shown.length === 0 && (
              <p className="text-sm text-cream-muted py-4 text-center">
                No notable rivals match the current filters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Career Comparison ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <RivalCareerCompareTable profiles={profiles} stableNames={stableNames} />
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/npc-stables/rival-careers")({
  head: () => ({
    meta: [
      { title: "Rival Careers — NPC Stable Career Records" },
      {
        name: "description",
        content:
          "Follow rival NPC stables' career timelines: debuts, graded breakthroughs, earnings milestones and retirements.",
      },
    ],
  }),
  component: NpcStablesRivalCareers,
});
