import { describe, it, expect } from "vitest";
import * as chartTheme from "@/components/charts/chartTheme";

describe("chartTheme live exports", () => {
  it("chartColors exports all expected keys", () => {
    expect(chartTheme.chartColors).toBeDefined();
    expect(chartTheme.chartColors.primary).toBe("var(--chart-1)");
    expect(chartTheme.chartColors.secondary).toBe("var(--chart-2)");
    expect(chartTheme.chartColors.tertiary).toBe("var(--chart-3)");
    expect(chartTheme.chartColors.slate).toBe("var(--chart-4)");
    expect(chartTheme.chartColors.negative).toBe("var(--chart-5)");
    expect(chartTheme.chartColors.grid).toBe("var(--chart-grid)");
    expect(chartTheme.chartColors.axis).toBe("var(--chart-axis)");
  });

  it("axisTickStyle has required shape", () => {
    expect(chartTheme.axisTickStyle).toBeDefined();
    expect(chartTheme.axisTickStyle.fill).toBe("var(--chart-axis)");
    expect(chartTheme.axisTickStyle.fontSize).toBe(10);
    expect(chartTheme.axisTickStyle.fontFamily).toBe("var(--font-mono)");
  });

  it("gridStyle has required shape", () => {
    expect(chartTheme.gridStyle).toBeDefined();
    expect(chartTheme.gridStyle.stroke).toBe("var(--chart-grid)");
    expect(chartTheme.gridStyle.strokeDasharray).toBe("3 3");
  });
});

describe("chartTheme dead exports are removed", () => {
  it("chartSeriesOrder is not exported", () => {
    expect((chartTheme as Record<string, unknown>)["chartSeriesOrder"]).toBeUndefined();
  });

  it("makeChartConfig is not exported", () => {
    expect((chartTheme as Record<string, unknown>)["makeChartConfig"]).toBeUndefined();
  });

  it("areaGradientStops is not exported", () => {
    expect((chartTheme as Record<string, unknown>)["areaGradientStops"]).toBeUndefined();
  });
});
