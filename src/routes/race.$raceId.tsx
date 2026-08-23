import { createFileRoute, lazyRouteComponent, Link } from "@tanstack/react-router";

type RaceSearch = { phase?: "preshow" | "live" | "review" };

export const Route = createFileRoute("/race/$raceId")({
  validateSearch: (raw: Record<string, unknown>): RaceSearch => {
    const v = raw?.phase;
    return v === "preshow" || v === "live" || v === "review" ? { phase: v } : {};
  },
  component: lazyRouteComponent(() => import("@/components/routes/LiveRace")),
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-cream">Race not found</h1>
      <Link
        to="/races"
        search={{ grade: "all", country: "all", surface: "all", track: "all", owned: "all", q: "" }}
        className="text-gold underline"
      >
        Back
      </Link>
    </div>
  ),
});
