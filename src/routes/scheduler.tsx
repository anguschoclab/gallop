import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/scheduler")({
  beforeLoad: () => {
    throw redirect({ to: "/racing", search: { tab: "scheduler" } });
  },
});
