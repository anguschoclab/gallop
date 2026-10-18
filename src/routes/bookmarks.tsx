import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/bookmarks")({
  component: lazyRouteComponent(() => import("@/domains/bookmarks/ui/pages/BookmarksPage")),
});
