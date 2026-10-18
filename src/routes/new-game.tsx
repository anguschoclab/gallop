import { createFileRoute } from "@tanstack/react-router";
import { NewGameWizard } from "@/domains/onboarding/ui";

export const Route = createFileRoute("/new-game")({
  component: NewGameWizard,
});
