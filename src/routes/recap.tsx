import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/recap")({
  beforeLoad: () => {
    throw redirect({ to: "/briefing", search: { tab: "recap" } });
  },
});
