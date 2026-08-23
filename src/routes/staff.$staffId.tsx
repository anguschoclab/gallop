import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/$staffId")({
  component: lazyRouteComponent(() => import("@/components/routes/StaffDetailPage")),
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-cream">Staff member not found</h1>
      <a href="/staff" className="text-gold underline mt-4 block">
        Back to Staff
      </a>
    </div>
  ),
});
