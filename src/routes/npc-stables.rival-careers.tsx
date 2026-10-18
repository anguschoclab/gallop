import { createFileRoute } from "@tanstack/react-router";
import { NpcStablesRivalCareers } from "@/components/routes/NpcStablesRivalCareers";

export const Route = createFileRoute("/npc-stables/rival-careers")({
  head: () => ({
    meta: [
      { title: "Rival Careers — NPC Stable Career Records" },
      {
        name: "description",
        content:
          "Follow rival NPC stables' career timelines: debuts, graded breakthroughs, earnings milestones and retirements.",
      },
    ],
  }),
  component: NpcStablesRivalCareers,
});
