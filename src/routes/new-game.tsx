import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NewGameWizard } from "@/components/NewGameWizard";

export const Route = createFileRoute("/new-game")({
  component: NewGameRoute,
});

function NewGameRoute() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate({ to: "/" });
  };

  return <NewGameWizard onComplete={handleComplete} />;
}
