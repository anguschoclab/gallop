import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useNpcStables } from "@/platform/game/hooks/useSystemsState";
import { getMajorStables } from "@/domains/stable/application/stableFacade";
import { useCompareStables } from "@/domains/stable/application/hooks/useCompareStables";
import { StableCompareTable } from "@/domains/stable/ui/StableCompareTable";
import { StableCompareBar } from "@/domains/stable/ui/StableCompareBar";
import { MAX_COMPARE } from "@/domains/stable/application/hooks/useCompareStables";

export function NpcStablesCompare() {
  const allStables = useNpcStables();
  const majorStables = getMajorStables(allStables);
  const compare = useCompareStables();
  const [filter, setFilter] = useState("");

  const filtered = majorStables.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()));

  // ⚡ Bolt Optimization:
  // Pre-calculate hash map for O(1) stable lookups instead of running O(N)
  // .find() inside the .map() loop.
  const stableMap = useMemo(() => new Map(majorStables.map((s) => [s.id, s])), [majorStables]);
  const selectedStables = useMemo(
    () =>
      compare.ids
        .map((id) => stableMap.get(id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined),
    [compare.ids, stableMap],
  );

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
            <StableCompareTable stables={selectedStables} />
          </CardContent>
        </Card>
      )}

      <StableCompareBar />
    </div>
  );
}
