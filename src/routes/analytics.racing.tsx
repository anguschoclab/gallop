import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics/racing")({
  beforeLoad: () => {
    throw redirect({ to: "/analytics", search: { tab: "racing" } });
  },
});
