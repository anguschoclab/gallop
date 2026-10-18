import { createFileRoute } from "@tanstack/react-router";
import { ReplaysLibrary } from "@/domains/replays/ui/ReplaysLibrary";

export const Route = createFileRoute("/replays")({
  component: ReplaysLibrary,
});
