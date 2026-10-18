/**
 * chartTheme.ts - Shared chart tokens for the modern-analytics chart kit.
 * Read by all charts under src/components/charts/* and the /analytics route.
 */
export const chartColors = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  tertiary: "var(--chart-3)",
  slate: "var(--chart-4)",
  negative: "var(--chart-5)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
} as const;

export const axisTickStyle = {
  fill: chartColors.axis,
  fontSize: 10,
  fontFamily: "var(--font-mono)",
} as const;

export const gridStyle = {
  stroke: chartColors.grid,
  strokeDasharray: "3 3",
} as const;
