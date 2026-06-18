import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/gazette")({
  beforeLoad: () => {
    throw redirect({ to: "/briefing", search: { tab: "gazette" } });
  },
});
