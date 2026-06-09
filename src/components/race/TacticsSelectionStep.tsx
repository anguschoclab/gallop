import { Check } from "lucide-react";
import { TACTIC_OPTIONS, type TacticId } from "./TacticOptions";

interface Props {
  selectedTactics: TacticId;
  onSelect: (id: TacticId) => void;
}

export function TacticsSelectionStep({ selectedTactics, onSelect }: Props) {
  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
        Tactical Instructions
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {TACTIC_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
              selectedTactics === opt.id
                ? "border-primary bg-primary/10"
                : "border-border bg-muted hover:bg-muted/80"
            }`}
          >
            <div className="flex justify-between items-center w-full">
              <span className="font-bold">{opt.name}</span>
              {selectedTactics === opt.id && <Check className="text-primary" size={16} />}
            </div>
            <span className="text-xs text-muted-foreground mt-1">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
