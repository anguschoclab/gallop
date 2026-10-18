import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/inbox")({
  component: lazyRouteComponent(() => import("@/domains/inbox/ui/pages/InboxPage")),
});
