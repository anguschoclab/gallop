import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hall-of-fame")({
  beforeLoad: () => {
    throw redirect({ to: "/honors", search: { tab: "hall-of-fame" } });
  },
});
