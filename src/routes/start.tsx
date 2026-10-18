import { createFileRoute } from "@tanstack/react-router";
import { StartScreen } from "@/domains/shell/ui/pages/StartScreen";

export const Route = createFileRoute("/start")({
  head: () => ({
    meta: [
      { title: "Gallop — Start" },
      { name: "description", content: "Build your dynasty. Train champions. Win the classics." },
      { property: "og:title", content: "Gallop — Stable Manager" },
      { property: "og:description", content: "A horse racing stable management simulation." },
    ],
  }),
  component: StartScreen,
});
