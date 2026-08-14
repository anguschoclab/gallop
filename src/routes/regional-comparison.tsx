import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RegionalTrendsWidget } from "@/components/dashboard/RegionalTrendsWidget";

export const Route = createFileRoute("/regional-comparison")({
  validateSearch: z.object({
    region: z.string().optional(),
    weeksA: z.number().optional(),
    weeksB: z.number().optional(),
    metric: z.enum(["raw", "rate"]).optional(),
    compare: z.boolean().optional(),
    surface: z.string().optional(),
    distMin: z.number().optional(),
    distMax: z.number().optional(),
    distPreset: z.enum(["all", "sprint", "mile", "route", "staying"]).optional(),
  }),
  component: RegionalComparisonPage,
});

function RegionalComparisonPage() {
  return <RegionalTrendsWidget routeMode />;
}
