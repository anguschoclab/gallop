import { createFileRoute } from "@tanstack/react-router";
import { StewardsLog } from "@/domains/stewards/ui/StewardsLog";

export const Route = createFileRoute("/stewards")({
  component: StewardsLog,
});
