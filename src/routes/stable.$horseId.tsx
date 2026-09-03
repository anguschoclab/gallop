import { createFileRoute, lazyRouteComponent, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/stable/$horseId")({
  component: lazyRouteComponent(() => import("@/components/routes/HorseDetail")),
  notFoundComponent: () => (
    <div className="p-12 text-center space-y-4">
      <h1 className="text-4xl font-black font-[family-name:var(--font-display)] text-cream">
        Horse not found
      </h1>
      <Link
        to="/stable"
        className="text-gold uppercase font-mono text-xs tracking-wide hover:underline"
      >
        Back to Stable
      </Link>
    </div>
  ),
});
