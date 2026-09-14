import { createFileRoute } from "@tanstack/react-router";
import { SyndicateStakesPage } from "@/components/syndicates/SyndicateStakesPage";

export const Route = createFileRoute("/syndicate-stakes")({
  head: () => ({
    meta: [
      { title: "Syndicate Stakes — Bloodstock Holdings & Reputation" },
      {
        name: "description",
        content:
          "Review all stallion syndicate holdings, dividend earnings, partner sentiment, and reputation impacts.",
      },
    ],
  }),
  component: SyndicateStakesPage,
});
