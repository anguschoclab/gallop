import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { shallow } from "zustand/shallow";
import { useGame } from "@/game/store";
import type { GameState } from "@/game/types";
import { JockeyCard } from "@/components/jockey/JockeyCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/jockey/$jockeyId")({
  component: JockeyPage,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-cream">Jockey not found</h1>
      <Link to="/jockeys" className="text-gold underline mt-4 block">
        Back to Jockeys
      </Link>
    </div>
  ),
});

function JockeyPage() {
  const { jockeyId } = Route.useParams();
  const jockeys = (useGame as any)((s: GameState) => s.jockeys, shallow);
  const hireJockey = useGame((s) => s.hireJockey);
  const releaseJockey = useGame((s) => s.releaseJockey);

  const jockey = jockeys?.find((j: any) => j.id === jockeyId);

  if (!jockey) {
    throw notFound();
  }

  const isRetained = !!jockey.contractUntil;

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <Link to="/jockeys">
        <Button variant="ghost" size="sm" className="mb-4 text-cream-muted hover:text-cream">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Roster
        </Button>
      </Link>

      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <JockeyCard
            jockey={jockey}
            isRetained={isRetained}
            actionLabel={isRetained ? "Release Jockey" : "Sign Retainer"}
            onAction={isRetained ? (j) => releaseJockey(j.id) : (j) => hireJockey(j.id, "retainer")}
          />
        </div>
      </div>
    </div>
  );
}
