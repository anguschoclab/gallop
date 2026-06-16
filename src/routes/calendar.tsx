import { createFileRoute, Outlet } from "@tanstack/react-router";

// Passthrough layout. `/calendar` and `/calendar/` redirect to the Racing hub
// via the index route (calendar.index.tsx); `/calendar/$regionId` still renders
// here so the hub's Calendar tab can link into a region's detail.
export const Route = createFileRoute("/calendar")({
  component: () => <Outlet />,
});
