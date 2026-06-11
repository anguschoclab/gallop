import { createFileRoute } from "@tanstack/react-router";
import { JockeyRoster } from "@/components/jockey/JockeyRoster";
import { ApprenticeTracker } from "@/components/apprentice/ApprenticeTracker";

export const Route = createFileRoute("/jockeys")({
  component: JockeysPage,
});

function JockeysPage() {
  return (
    <div className="p-6 space-y-6">
      <ApprenticeTracker />
      <JockeyRoster />
    </div>
  );
}
