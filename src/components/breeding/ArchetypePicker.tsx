import { useState } from "react";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { ALL_ARCHETYPES } from "@/core/breeding/archetypes";
import { ArchetypeCard } from "./ArchetypeCard";
import { toast } from "sonner";
import { Target } from "lucide-react";

export function ArchetypePicker() {
  const startBreedingProgram = useGame((s) => s.startBreedingProgram);
  const [filter, setFilter] = useState<"all" | "turf" | "dirt" | "classic" | "triple">("all");

  const filtered = ALL_ARCHETYPES.filter((a) => {
    if (filter === "turf") return a.targetPhenotype.surface === "Turf";
    if (filter === "dirt") return a.targetPhenotype.surface === "Dirt";
    if (filter === "triple") return a.id.startsWith("triple-crown");
    if (filter === "classic") return !a.id.startsWith("triple-crown");
    return true;
  });

  const handleSelect = (id: string) => {
    const result = startBreedingProgram(id);
    if (result.ok) {
      toast.success("Breeding program started.");
    } else {
      toast.error(result.reason);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] flex items-center gap-2">
            <Target className="h-5 w-5 text-gold" />
            Choose an Archetype
          </CardTitle>
          <p className="text-sm text-cream-muted font-[family-name:var(--font-body)]">
            A breeding program gives you a generational target. The simulator will highlight
            stallions that move your line closer to the archetype.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "classic", "turf", "dirt", "triple"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-[family-name:var(--font-mono)] transition-colors",
                  filter === f ? "bg-gold text-t950" : "bg-t700 text-cream-muted hover:bg-t600",
                )}
              >
                {f === "triple" ? "Triple Crown" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((a) => (
              <ArchetypeCard key={a.id} archetype={a} onSelect={handleSelect} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
