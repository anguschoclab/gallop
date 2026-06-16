import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sire-leaderboards")({
  beforeLoad: () => {
    throw redirect({ to: "/breeding", search: { tab: "sire-leaderboards" } });
  },
});
