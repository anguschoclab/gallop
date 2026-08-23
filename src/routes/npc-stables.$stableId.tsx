import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  tab: fallback(
    z.enum(["overview", "roster", "staff", "history", "ai-profile"]),
    "overview",
  ).default("overview"),
});

export const Route = createFileRoute("/npc-stables/$stableId")({
  component: lazyRouteComponent(() => import("@/components/routes/NpcStableDetailPage")),
  validateSearch: zodValidator(searchSchema),
});
