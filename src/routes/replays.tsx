import { createFileRoute } from "@tanstack/react-router";
import { ReplaysLibrary } from "@/components/replays/ReplaysLibrary";

export const Route = createFileRoute("/replays")({
  component: ReplaysLibrary,
});
