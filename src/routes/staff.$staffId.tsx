import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/staff/$staffId")({
  component: lazyRouteComponent(() => import("@/domains/staff/ui/pages/StaffDetailPage")),
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-foreground">Staff member not found</h1>
      <a href="/staff" className="text-primary underline mt-4 block">
        Back to Staff
      </a>
    </div>
  ),
});
