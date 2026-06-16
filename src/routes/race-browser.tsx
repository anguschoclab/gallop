import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/race-browser")({
  beforeLoad: () => {
    throw redirect({ to: "/racing", search: { tab: "browser" } });
  },
});
