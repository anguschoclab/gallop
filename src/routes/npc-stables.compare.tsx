import { createFileRoute } from "@tanstack/react-router";
import { NpcStablesCompare } from "@/components/routes/NpcStablesCompare";

export const Route = createFileRoute("/npc-stables/compare")({
  component: NpcStablesCompare,
});
