import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics/stable")({
  beforeLoad: () => {
    throw redirect({ to: "/analytics", search: { tab: "stable" } });
  },
});
