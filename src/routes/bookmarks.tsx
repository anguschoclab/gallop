import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/bookmarks")({
  component: lazyRouteComponent(() => import("@/components/routes/BookmarksPage")),
});
