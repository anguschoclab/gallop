import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/syndicate/$syndicateId")({
  component: lazyRouteComponent(() => import("@/components/routes/SyndicatePage")),
});
