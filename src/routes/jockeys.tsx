import { createFileRoute } from "@tanstack/react-router";
import { JockeyRoster } from "@/components/jockey/JockeyRoster";

export const Route = createFileRoute("/jockeys")({
  component: JockeysPage,
});

function JockeysPage() {
  return (
    <div className="p-6">
      <JockeyRoster />
    </div>
  );
}
