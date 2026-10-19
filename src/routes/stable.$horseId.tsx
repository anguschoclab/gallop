import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { ErrorState } from "@/shared/ui/common/ErrorState";

export const Route = createFileRoute("/stable/$horseId")({
  component: lazyRouteComponent(() => import("@/domains/horse/ui/pages/HorseDetail")),
  notFoundComponent: () => (
    <ErrorState
      title="Horse not found"
      description="This horse may have been sold or is no longer in the registry."
      backTo="/stable"
      backLabel="Back to Stable"
    />
  ),
});
