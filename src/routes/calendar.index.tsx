import { createFileRoute, redirect } from "@tanstack/react-router";

// The region picker now lives in the Racing hub's Calendar tab
// (src/components/racing/CalendarTab.tsx). Redirect the bare /calendar path there.
export const Route = createFileRoute("/calendar/")({
  beforeLoad: () => {
    throw redirect({ to: "/racing", search: { tab: "calendar" } });
  },
});
