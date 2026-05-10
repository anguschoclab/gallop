import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/npc-stables")({
  component: () => <Outlet />,
});
