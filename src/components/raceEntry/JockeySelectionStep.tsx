import type { Horse, Jockey } from "@/game/types";
import { JockeyCard } from "@/components/JockeyCard";
import { getCompatibility } from "@/core/jockey/compatibility";

interface Props {
  marketJockeys: Jockey[];
  selectedJockeyId: string | null;
  selectedHorse: Horse | undefined;
  onSelect: (id: string) => void;
}

export function JockeySelectionStep({
  marketJockeys,
  selectedJockeyId,
  selectedHorse,
  onSelect,
}: Props) {
  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
        Select Jockey
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {marketJockeys.slice(0, 6).map((j: Jockey) => (
          <div
            key={j.id}
            onClick={() => onSelect(j.id)}
            className={`cursor-pointer transition-all ${selectedJockeyId === j.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""}`}
          >
            <div className="relative">
              <JockeyCard jockey={j} isRetained={!!j.contractUntil} />
              {selectedHorse && (
                <div
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    getCompatibility(selectedHorse, j) === "High"
                      ? "bg-success text-success-foreground"
                      : getCompatibility(selectedHorse, j) === "Poor"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {getCompatibility(selectedHorse, j)} Match
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
