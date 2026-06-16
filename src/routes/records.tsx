import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/records")({
  beforeLoad: () => {
    throw redirect({ to: "/honors", search: { tab: "records" } });
  },
});
