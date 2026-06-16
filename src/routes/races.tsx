import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/races")({
  beforeLoad: () => {
    throw redirect({ to: "/racing", search: { tab: "races" } });
  },
});
