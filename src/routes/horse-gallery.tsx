import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";

export const Route = createFileRoute("/horse-gallery")({
  component: lazyRouteComponent(() => import("@/components/routes/HorseGalleryPage")),
});
