import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics/breeding")({
  beforeLoad: () => {
    throw redirect({ to: "/analytics", search: { tab: "breeding" } });
  },
});
