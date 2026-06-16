import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics/finance")({
  beforeLoad: () => {
    throw redirect({ to: "/analytics", search: { tab: "finance" } });
  },
});
