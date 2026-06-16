import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/sire-watch/")({
  beforeLoad: () => {
    throw redirect({ to: "/breeding", search: { tab: "sire-watch" } });
  },
});
