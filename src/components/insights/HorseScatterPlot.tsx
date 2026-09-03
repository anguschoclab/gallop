/**
 * HorseScatterPlot.tsx - Large-scale horse comparison scatter plot with drag (brush) selection
 *
 * Renders any InsightRow metric against any other. Users can drag a rectangle
 * over the plot to select many horses at once, then right-click the plot to run
 * bulk actions through a context menu (same interaction model as data tables).
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import {
  INSIGHT_METRIC_BY_KEY,
  metricExtent,
  type InsightMetricKey,
  type InsightRow,
} from "@/core/horse/insightMetrics";
import { cn } from "@/lib/cn";

const W = 820;
const H = 460;
const M = { top: 16, right: 20, bottom: 46, left: 74 };

interface HorseScatterPlotProps {
  rows: InsightRow[];
  xKey: InsightMetricKey;
  yKey: InsightMetricKey;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** Context-menu items rendered for the current selection. */
  contextMenuItems: ReactNode;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const norm = (b: Box) => ({
  left: Math.min(b.x0, b.x1),
  right: Math.max(b.x0, b.x1),
  top: Math.min(b.y0, b.y1),
  bottom: Math.max(b.y0, b.y1),
});

function ticks(min: number, max: number, count = 5): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export function HorseScatterPlot({
  rows,
  xKey,
  yKey,
  selectedIds,
  onSelectionChange,
  contextMenuItems,
}: HorseScatterPlotProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<Box | null>(null);
  const [hover, setHover] = useState<InsightRow | null>(null);

  const xMetric = INSIGHT_METRIC_BY_KEY[xKey];
  const yMetric = INSIGHT_METRIC_BY_KEY[yKey];

  const [xMin, xMax] = useMemo(() => metricExtent(rows, xKey), [rows, xKey]);
  const [yMin, yMax] = useMemo(() => metricExtent(rows, yKey), [rows, yKey]);

  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  const sx = useCallback(
    (v: number) => M.left + ((v - xMin) / (xMax - xMin)) * plotW,
    [xMin, xMax, plotW],
  );
  const sy = useCallback(
    (v: number) => M.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH,
    [yMin, yMax, plotH],
  );

  const points = useMemo(
    () =>
      rows.map((r) => ({
        row: r,
        cx: sx(r.metrics[xKey]),
        cy: sy(r.metrics[yKey]),
      })),
    [rows, sx, sy, xKey, yKey],
  );

  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toLocal = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const { x, y } = toLocal(e);
    setDrag({ x0: x, y0: y, x1: x, y1: y });
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const { x, y } = toLocal(e);
    setDrag({ ...drag, x1: x, y1: y });
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const box = norm(drag);
    setDrag(null);
    svgRef.current?.releasePointerCapture?.(e.pointerId);
    const width = box.right - box.left;
    const height = box.bottom - box.top;
    if (width < 4 && height < 4) {
      // Treat as a click: select nothing (clears selection).
      onSelectionChange([]);
      return;
    }
    const hit = points
      .filter((p) => p.cx >= box.left && p.cx <= box.right && p.cy >= box.top && p.cy <= box.bottom)
      .map((p) => p.row.id);
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    onSelectionChange(additive ? Array.from(new Set([...selectedIds, ...hit])) : hit);
  };

  const dragBox = drag ? norm(drag) : null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="relative select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto touch-none cursor-crosshair"
            role="img"
            aria-label={`Scatter plot of ${rows.length} horses: ${yMetric.label} versus ${xMetric.label}. Drag to select, right-click for actions.`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* grid + axes */}
            {ticks(yMin, yMax).map((t) => (
              <g key={`y${t}`}>
                <line
                  x1={M.left}
                  x2={W - M.right}
                  y1={sy(t)}
                  y2={sy(t)}
                  className="stroke-white/5"
                />
                <text
                  x={M.left - 8}
                  y={sy(t) + 3}
                  textAnchor="end"
                  className="fill-cream/40 font-mono text-[9px]"
                >
                  {yMetric.format(t)}
                </text>
              </g>
            ))}
            {ticks(xMin, xMax).map((t) => (
              <g key={`x${t}`}>
                <line
                  y1={M.top}
                  y2={M.top + plotH}
                  x1={sx(t)}
                  x2={sx(t)}
                  className="stroke-white/5"
                />
                <text
                  x={sx(t)}
                  y={H - M.bottom + 16}
                  textAnchor="middle"
                  className="fill-cream/40 font-mono text-[9px]"
                >
                  {xMetric.format(t)}
                </text>
              </g>
            ))}
            <text
              x={M.left + plotW / 2}
              y={H - 8}
              textAnchor="middle"
              className="fill-cream/60 font-mono text-[10px] uppercase tracking-wide"
            >
              {xMetric.label}
            </text>
            <text
              transform={`translate(14 ${M.top + plotH / 2}) rotate(-90)`}
              textAnchor="middle"
              className="fill-cream/60 font-mono text-[10px] uppercase tracking-wide"
            >
              {yMetric.label}
            </text>

            {/* points */}
            {points.map((p) => {
              const isSel = selected.has(p.row.id);
              return (
                <circle
                  key={p.row.id}
                  cx={p.cx}
                  cy={p.cy}
                  r={isSel ? 5 : 3}
                  className={cn(
                    "transition-[r] duration-150",
                    isSel
                      ? "fill-gold stroke-gold"
                      : p.row.scouted
                        ? "fill-success/70 stroke-success/40"
                        : "fill-cream/25 stroke-cream/10",
                  )}
                  strokeWidth={isSel ? 2 : 1}
                  onPointerEnter={() => setHover(p.row)}
                  onPointerLeave={() => setHover((h) => (h?.id === p.row.id ? null : h))}
                />
              );
            })}

            {/* drag rectangle */}
            {dragBox && (
              <rect
                x={dragBox.left}
                y={dragBox.top}
                width={Math.max(0, dragBox.right - dragBox.left)}
                height={Math.max(0, dragBox.bottom - dragBox.top)}
                className="fill-gold/10 stroke-gold/60"
                strokeDasharray="4 3"
              />
            )}
          </svg>

          {hover && (
            <div className="pointer-events-none absolute top-2 right-2 bg-slate-950/95 border border-white/10 px-3 py-2 text-[10px] font-mono text-cream/80 space-y-0.5">
              <div className="text-cream font-bold uppercase tracking-wider">{hover.name}</div>
              <div>{hover.ownerLabel}</div>
              <div>
                {xMetric.short}: {xMetric.format(hover.metrics[xKey])}
              </div>
              <div>
                {yMetric.short}: {yMetric.format(hover.metrics[yKey])}
              </div>
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">{contextMenuItems}</ContextMenuContent>
    </ContextMenu>
  );
}
