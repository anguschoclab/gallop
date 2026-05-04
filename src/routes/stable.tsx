import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { HorseCard } from "@/components/HorseCard";
import { HorseCompare } from "@/components/HorseCompare";

export const Route = createFileRoute("/stable")({
  component: StablePage,
});

function StablePage() {
  const horses = useGame((s) => s.horses.filter((h) => h.owned));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Stable</h1>
          <p className="text-muted-foreground">{horses.length} horses</p>
        </div>
        {horses.length >= 2 && <HorseCompare horses={horses} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {horses.map((h) => (
          <Link key={h.id} to="/stable/$horseId" params={{ horseId: h.id }}>
            <HorseCard horse={h} variant="full" />
          </Link>
        ))}
      </div>
    </div>
  );
}
