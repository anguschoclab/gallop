/**
 * npc-stables.rival-careers.tsx - Rival career comparison view
 *
 * Multi-select list of notable rival horses with a side-by-side career table
 * (age, starts, wins, earnings, fame, stage, milestone history).
 *
 * Dependencies: @/hooks/game/useCoreState, @/hooks/game/useSystemsState,
 *   @/core/npc/rivalCareerCompare, @/components/stable/RivalCareerCompareTable
 * Related files: src/routes/npc-stables.compare.tsx (stable-level compare)
 */

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHorses, useDay } from "@/hooks/game/useCoreState";
import { useNpcStables } from "@/hooks/game/useSystemsState";
import { isPlayerOwned, getStableId } from "@/core/horse/ownership";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { isNotableRival } from "@/core/npc/careerMilestones";
import { buildRivalCareerProfiles } from "@/core/npc/rivalCareerCompare";
import { RivalCareerCompareTable } from "@/components/stable/RivalCareerCompareTable";
import type { Horse } from "@/game/types";

const MAX_RIVAL_COMPARE = 4;

export function NpcStablesRivalCareers() {
  const horses = useHorses();
  const day = useDay();
  const npcStables = useNpcStables();
  const [filter, setFilter] = useState("");
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

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rivals.slice(0, 40);
    return rivals.filter((h) => h.name.toLowerCase().includes(q)).slice(0, 40);
  }, [rivals, filter]);

  const profiles = useMemo(() => {
    const byId = new Map(rivals.map((h) => [h.id, h]));
    const picked = selected
      .map((id) => byId.get(id))
      .filter((h): h is Horse => h !== undefined);
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
            <Input
              placeholder="Filter by name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
            {selected.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((h) => {
              const checked = selected.includes(h.id);
              const disabled = !checked && selected.length >= MAX_RIVAL_COMPARE;
              const sid = getStableId(h);
              return (
                <label
                  key={h.id}
                  className="flex items-center gap-3 rounded-md border border-border/50 p-2 hover:bg-card/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(h.id)}
                    aria-label={h.name}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm text-cream">{h.name}</span>
                  <span className="text-xs text-cream-muted">
                    {Math.floor(h.age)}Y · {(sid && stableNames[sid]) || "Unattached"}
                  </span>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-cream-muted py-4 text-center">
                No notable rivals match "{filter}".
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
  component: NpcStablesRivalCareers,
});
