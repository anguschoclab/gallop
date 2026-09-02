/**
 * ScoutingInsightsPanel.tsx - Large-scale horse comparison for the scouting page
 *
 * Plots the entire scoutable horse population on a scatter plot (any metric vs any
 * metric), lets the player drag a rectangle over many horses at once, and exposes
 * bulk actions through a right-click context menu, mirroring data-table behaviour.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { HorseScatterPlot } from "./HorseScatterPlot";
import { useBookmarks } from "@/hooks/shared/useBookmarks";
import { useGame, useGameWithShallow } from "@/game/store";
import type { GameState } from "@/game/types";
import type { Horse } from "@/core/horse/types";
import { isNpcOwned, isPlayerOwned } from "@/core/horse/ownership";
import {
  INSIGHT_METRICS,
  INSIGHT_METRIC_BY_KEY,
  buildInsightRow,
  type InsightMetricKey,
  type InsightRow,
} from "@/core/horse/insightMetrics";
import { BarChart3, Bookmark, Copy, Eye, Filter, Search, X } from "lucide-react";

type PoolKey = "npc" | "market" | "all" | "mine";

const POOLS: { value: PoolKey; label: string }[] = [
  { value: "npc", label: "Rival stables" },
  { value: "market", label: "Open market" },
  { value: "all", label: "All horses" },
  { value: "mine", label: "My stable" },
];

export function ScoutingInsightsPanel() {
  const navigate = useNavigate();
  const horses = useGameWithShallow((s: GameState) => s.horses);
  const npcStables = useGameWithShallow((s: GameState) => s.npcStables ?? []);
  const scoutHorse = useGame((s) => s.scoutHorse);
  const { add: addBookmark } = useBookmarks();

  const [pool, setPool] = useState<PoolKey>("npc");
  const [xKey, setXKey] = useState<InsightMetricKey>("age");
  const [yKey, setYKey] = useState<InsightMetricKey>("overall");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [onlySelected, setOnlySelected] = useState(false);

  const allHorses = useMemo<Horse[]>(
    () => (Array.isArray(horses) ? horses : Object.values(horses ?? {})) as Horse[],
    [horses],
  );

  const stableNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of npcStables) map.set(s.id, s.name);
    return map;
  }, [npcStables]);

  const rows = useMemo<InsightRow[]>(() => {
    const pooled = allHorses.filter((h) => {
      if (h.lifecycleStatus === "deceased") return false;
      // Pedigree ancestors are stored as horses too; keep the plot to runners.
      if ((h.age ?? 0) > 30) return false;
      if (pool === "mine") return isPlayerOwned(h);
      if (pool === "npc") return isNpcOwned(h);
      if (pool === "market") return !isNpcOwned(h) && !isPlayerOwned(h);
      return true;
    });
    return pooled.map((raw) => {
      // World horses are created with a deferred phenotype (stats all zero
      // until resolved), so resolve before reading any stat-based metric.
      const h = ensurePhenotypeResolved(raw);
      const ownerId = h.ownership.type === "npc" ? h.ownership.stableId : null;
      const ownerLabel = isPlayerOwned(h)
        ? "My stable"
        : ownerId
          ? (stableNames.get(ownerId) ?? "Rival stable")
          : "Open market";
      return buildInsightRow(h, allHorses, ownerLabel, ownerId);
    });
  }, [allHorses, pool, stableNames]);


  const visibleRows = useMemo(
    () => (onlySelected ? rows.filter((r) => selectedIds.includes(r.id)) : rows),
    [rows, onlySelected, selectedIds],
  );

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds],
  );

  const xMetric = INSIGHT_METRIC_BY_KEY[xKey];
  const yMetric = INSIGHT_METRIC_BY_KEY[yKey];

  const average = (key: InsightMetricKey, list: InsightRow[]) =>
    list.length === 0 ? 0 : list.reduce((sum, r) => sum + r.metrics[key], 0) / list.length;

  const bookmarkSelected = () => {
    for (const r of selectedRows) {
      addBookmark({
        type: "horse",
        id: r.id,
        label: r.name,
        subtitle: r.ownerLabel,
        tags: ["insights"],
      });
    }
    toast.success(`Bookmarked ${selectedRows.length} horse(s)`);
  };

  const scoutSelected = () => {
    let ok = 0;
    let failed = 0;
    let spent = 0;
    for (const r of selectedRows) {
      const res = scoutHorse?.(r.id);
      if (res?.success) {
        ok += 1;
        spent += res.cost ?? 0;
      } else {
        failed += 1;
      }
    }
    if (ok > 0) toast.success(`Scouted ${ok} horse(s) for ${spent.toLocaleString()}`);
    if (failed > 0) toast.error(`${failed} horse(s) could not be scouted`);
  };

  const copyNames = () => {
    const text = selectedRows.map((r) => `${r.name}\t${r.ownerLabel}`).join("\n");
    void navigator.clipboard?.writeText(text);
    toast.success(`Copied ${selectedRows.length} name(s)`);
  };

  const contextMenuItems = (
    <>
      <ContextMenuLabel className="font-mono text-[10px] uppercase tracking-widest">
        {selectedRows.length} selected
      </ContextMenuLabel>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={selectedRows.length !== 1}
        onSelect={() => {
          const first = selectedRows[0];
          if (first) navigate({ to: "/stable/$horseId", params: { horseId: first.id } });
        }}
      >
        <Eye className="mr-2 h-3.5 w-3.5" /> Open profile
      </ContextMenuItem>
      <ContextMenuItem disabled={selectedRows.length === 0} onSelect={scoutSelected}>
        <Search className="mr-2 h-3.5 w-3.5" /> Scout selected
      </ContextMenuItem>
      <ContextMenuItem disabled={selectedRows.length === 0} onSelect={bookmarkSelected}>
        <Bookmark className="mr-2 h-3.5 w-3.5" /> Bookmark selected
      </ContextMenuItem>
      <ContextMenuItem disabled={selectedRows.length === 0} onSelect={copyNames}>
        <Copy className="mr-2 h-3.5 w-3.5" /> Copy names
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        disabled={selectedRows.length === 0}
        onSelect={() => setOnlySelected((v) => !v)}
      >
        <Filter className="mr-2 h-3.5 w-3.5" />
        {onlySelected ? "Show all horses" : "Keep only selected"}
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => setSelectedIds(rows.map((r) => r.id))}>
        Select all ({rows.length})
      </ContextMenuItem>
      <ContextMenuItem disabled={selectedRows.length === 0} onSelect={() => setSelectedIds([])}>
        <X className="mr-2 h-3.5 w-3.5" /> Clear selection
      </ContextMenuItem>
    </>
  );

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/40 border-white/5 rounded-none">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-end gap-3 justify-between">
            <div>
              <div className="flex items-center gap-2 text-gold uppercase tracking-[0.2em] font-mono text-[10px] font-bold">
                <BarChart3 className="h-3.5 w-3.5" />
                Bloodstock Insights
              </div>
              <p className="text-[11px] text-cream-muted mt-1 font-mono">
                Drag a box over the plot to select horses, then right-click for bulk actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={pool} onValueChange={(v) => {
                  setSelectedIds([]);
                  setPool(v as PoolKey);
                }}>
                <SelectTrigger className="h-9 w-40 text-xs" aria-label="Horse pool">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POOLS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={xKey} onValueChange={(v) => setXKey(v as InsightMetricKey)}>
                <SelectTrigger className="h-9 w-44 text-xs" aria-label="X axis metric">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSIGHT_METRICS.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      X: {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yKey} onValueChange={(v) => setYKey(v as InsightMetricKey)}>
                <SelectTrigger className="h-9 w-44 text-xs" aria-label="Y axis metric">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INSIGHT_METRICS.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      Y: {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>Plotted: {visibleRows.length}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-gold">Selected: {selectedRows.length}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-success">Scouted</span>
            <span className="text-cream/30">Unscouted</span>
            {onlySelected && (
              <Badge
                variant="outline"
                className="border-gold/40 text-gold cursor-pointer"
                onClick={() => setOnlySelected(false)}
              >
                Filtered to selection · clear
              </Badge>
            )}
          </div>

          <HorseScatterPlot
            rows={visibleRows}
            xKey={xKey}
            yKey={yKey}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            contextMenuItems={contextMenuItems}
          />
        </CardContent>
      </Card>

      {selectedRows.length > 0 && (
        <Card className="bg-slate-900/40 border-white/5 rounded-none">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-cream">
                Selection · {selectedRows.length} horses
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={bookmarkSelected}>
                  Bookmark all
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex gap-6 font-mono text-[10px] uppercase tracking-widest text-cream/50">
              <span>
                Avg {xMetric.short}: {xMetric.format(average(xKey, selectedRows))}
              </span>
              <span>
                Avg {yMetric.short}: {yMetric.format(average(yKey, selectedRows))}
              </span>
            </div>
            <div className="max-h-72 overflow-auto border border-white/5">
              <table className="w-full text-xs">
                <thead className="bg-slate-950/60 sticky top-0">
                  <tr className="text-left font-mono text-[9px] uppercase tracking-widest text-cream/40">
                    <th className="p-2">Horse</th>
                    <th className="p-2">Owner</th>
                    <th className="p-2 text-right">{xMetric.short}</th>
                    <th className="p-2 text-right">{yMetric.short}</th>
                    <th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((r) => (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-2 text-cream">{r.name}</td>
                      <td className="p-2 text-cream/50">{r.ownerLabel}</td>
                      <td className="p-2 text-right font-mono tabular-nums">
                        {xMetric.format(r.metrics[xKey])}
                      </td>
                      <td className="p-2 text-right font-mono tabular-nums">
                        {yMetric.format(r.metrics[yKey])}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px]"
                          onClick={() =>
                            navigate({ to: "/stable/$horseId", params: { horseId: r.id } })
                          }
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
