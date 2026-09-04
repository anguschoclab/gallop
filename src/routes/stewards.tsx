import { createFileRoute } from "@tanstack/react-router";
import { StewardsLog } from "@/components/stewards/StewardsLog";

export const Route = createFileRoute("/stewards")({
  component: StewardsLog,
});
