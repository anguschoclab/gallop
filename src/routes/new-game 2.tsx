import { createFileRoute } from "@tanstack/react-router";
import { NewGameWizard } from "@/components/NewGameWizard";

export const Route = createFileRoute("/new-game 2")({
  component: NewGameWizard,
});
