import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RegionalTrendsWidget } from "@/components/dashboard/RegionalTrendsWidget";
import { METRIC_MODES, DIST_PRESET_VALUES } from "@/constants/regionalConstants";

export const Route = createFileRoute("/regional-comparison")({
  validateSearch: z.object({
    region: z.string().optional(),
    weeksA: z.number().optional(),
    weeksB: z.number().optional(),
    metric: z.enum(METRIC_MODES as [string, ...string[]]).optional(),
    compare: z.boolean().optional(),
    surface: z.string().optional(),
    distMin: z.number().optional(),
    distMax: z.number().optional(),
    distPreset: z.enum(DIST_PRESET_VALUES as [string, ...string[]]).optional(),
  }),
  component: RegionalComparisonPage,
});

function RegionalComparisonPage() {
  return <RegionalTrendsWidget routeMode />;
}
