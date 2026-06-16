import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/stallions")({
  beforeLoad: () => {
    throw redirect({ to: "/breeding", search: { tab: "stallions" } });
  },
});
