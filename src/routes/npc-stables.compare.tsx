import { createFileRoute } from "@tanstack/react-router";
import { NpcStablesCompare } from "@/domains/agents/ui/pages/NpcStablesCompare";

export const Route = createFileRoute("/npc-stables/compare")({
  component: NpcStablesCompare,
});
