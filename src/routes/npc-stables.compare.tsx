/**
 * npc-stables.compare.tsx - Dedicated compare route for NPC stables
 *
 * Multi-select list of major stables with checkboxes bound to useCompareStables,
 * an inline StableCompareTable for the selected stables, and a StableCompareBar
 * for drawer access.
 *
 * Dependencies: @/hooks/game/useSystemsState (useNpcStables), @/core/stable/stableQueries (getMajorStables), @/hooks/stable/useCompareStables (useCompareStables), @/components/stable/StableCompareTable (StableCompareTable), @/components/stable/StableCompareBar (StableCompareBar)
 * Related files: src/routes/npc-stables.tsx (parent layout)
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNpcStables } from "@/hooks/game/useSystemsState";
import { getMajorStables } from "@/core/stable/stableQueries";
import { useCompareStables } from "@/hooks/stable/useCompareStables";
import { StableCompareTable } from "@/components/stable/StableCompareTable";
import { StableCompareBar } from "@/components/stable/StableCompareBar";
import { MAX_COMPARE } from "@/hooks/stable/useCompareStables";

export function NpcStablesCompare() {
  const allStables = useNpcStables();
  const majorStables = getMajorStables(allStables);
  const compare = useCompareStables();
  const [filter, setFilter] = useState("");

  const filtered = majorStables.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-[family-name:var(--font-display)] text-cream">
          Compare NPC Stables
        </h1>
        <p className="text-sm text-cream-muted mt-1">
          Select up to {MAX_COMPARE} major stables to compare cash pressure, runway, and
          private-sale thresholds side by side.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Stables</CardTitle>
          <Input
            placeholder="Filter by name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.map((stable) => {
              const checked = compare.has(stable.id);
              const disabled = !checked && compare.ids.length >= MAX_COMPARE;
              return (
                <label
                  key={stable.id}
                  className="flex items-center gap-3 rounded-md border border-border/50 p-2 hover:bg-card/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => compare.toggle(stable.id)}
                    aria-label={stable.name}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm text-cream">{stable.name}</span>
                  <span className="text-xs text-cream-muted">
                    {stable.horses.length} horses · {stable.tier}
                  </span>
                </label>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-cream-muted py-4 text-center">
                No stables match "{filter}".
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {compare.ids.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparison ({compare.ids.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <StableCompareTable
              stables={compare.ids
                .map((id) => majorStables.find((s) => s.id === id))
                .filter((s): s is NonNullable<typeof s> => s !== undefined)}
            />
          </CardContent>
        </Card>
      )}

      <StableCompareBar />
    </div>
  );
}

export const Route = createFileRoute("/npc-stables/compare")({
  component: NpcStablesCompare,
});
