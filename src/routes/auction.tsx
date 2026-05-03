import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/auction")({
  component: AuctionLayout,
});

function AuctionLayout() {
  return <Outlet />;
}
