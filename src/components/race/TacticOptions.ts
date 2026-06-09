export const TACTIC_OPTIONS = [
  {
    id: "default",
    name: "Default",
    desc: "Jockey will use their best judgment based on horse style.",
  },
  {
    id: "lead",
    name: "Lead at all costs",
    desc: "Aggressive push for the front. High speed boost but drains stamina fast.",
  },
  {
    id: "rail",
    name: "Hug the Rail",
    desc: "Stay in lane 0. Saves distance but risks getting boxed in.",
  },
  {
    id: "outside",
    name: "Stay Outside",
    desc: "Avoid traffic by staying wide. No boxing risk but covers more ground.",
  },
  { id: "save", name: "Save Ground", desc: "Prioritize drafting behind other horses." },
  {
    id: "late_kick",
    name: "Late Kick",
    desc: "Sit back and conserve energy for a massive boost in the final 20%.",
  },
] as const;

export type TacticId = (typeof TACTIC_OPTIONS)[number]["id"];
