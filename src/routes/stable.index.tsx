import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const stableSearchSchema = z.object({
  tab: fallback(z.enum(["roster", "rivals"]), "roster").default("roster"),
  status: fallback(z.enum(["active", "retired", "auctioned", "all"]), "active").default("active"),
  rivalQ: fallback(z.string(), "").default(""),
  rivalTier: fallback(z.string(), "all").default("all"),
  view: fallback(z.enum(["ledger", "gallery"]), "ledger").default("ledger"),
  tendency: fallback(z.enum(["any", "front", "mid", "off"]), "any").default("any"),
  trip: fallback(z.enum(["any", "sprint", "mile", "route"]), "any").default("any"),
  surface: fallback(z.enum(["any", "Turf", "Dirt", "Synthetic"]), "any").default("any"),
  compareIds: fallback(z.array(z.string()), []).default([]),
});

export const Route = createFileRoute("/stable/")({
  validateSearch: zodValidator(stableSearchSchema),
  component: lazyRouteComponent(() => import("@/components/routes/StablePage")),
});
