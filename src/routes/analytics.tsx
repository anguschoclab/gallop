import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsLayout,
});

function AnalyticsLayout() {
  return <Outlet />;
}
