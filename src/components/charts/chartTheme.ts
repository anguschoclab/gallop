/**
 * chartTheme.ts - Shared chart tokens for the modern-analytics chart kit.
 * Read by all charts under src/components/charts/* and the /analytics route.
 */
import type { ChartConfig } from "@/components/ui/chart";

export const chartColors = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  tertiary: "var(--chart-3)",
  slate: "var(--chart-4)",
  negative: "var(--chart-5)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
} as const;

export const chartSeriesOrder = [
  chartColors.primary,
  chartColors.secondary,
  chartColors.tertiary,
  chartColors.slate,
  chartColors.negative,
];

export const axisTickStyle = {
  fill: chartColors.axis,
  fontSize: 10,
  fontFamily: "var(--font-mono)",
} as const;

export const gridStyle = {
  stroke: chartColors.grid,
  strokeDasharray: "3 3",
} as const;

export function makeChartConfig(
  series: { key: string; label: string; color?: string }[],
): ChartConfig {
  const cfg: ChartConfig = {};
  series.forEach((s, i) => {
    cfg[s.key] = { label: s.label, color: s.color ?? chartSeriesOrder[i % chartSeriesOrder.length] };
  });
  return cfg;
}

/** Gradient stop helper for area charts; pass a unique id per chart. */
export function areaGradientStops(id: string, color: string = chartColors.primary) {
  return { id, color };
}
