import { createFileRoute } from "@tanstack/react-router";
import { RivalStakesPage } from "@/domains/syndicates/ui/RivalStakesPage";

export const Route = createFileRoute("/rivalStakes")({
  head: () => ({
    meta: [
      { title: "Rival Horse Stakes — Share Rival Prizes & Prestige" },
      {
        name: "description",
        content:
          "Buy stakes in rival stables' racehorses and track your share of their prize money, price and prestige.",
      },
      { property: "og:title", content: "Rival Horse Stakes — Share Rival Prizes & Prestige" },
      {
        property: "og:description",
        content: "Own part of a rival's racehorse and collect your share of every prize it wins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <RivalStakesPage />,
});
