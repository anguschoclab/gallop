import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/syndicate/$syndicateId")({
  component: lazyRouteComponent(() => import("@/domains/syndicates/ui/pages/SyndicatePage")),
});
