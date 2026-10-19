import type { WorldSize } from "@/domains/stable/application/stableFacade";
import { WORLD_SIZE_CONFIGS } from "@/domains/stable/application/stableFacade";

interface StepWorldSizeProps {
  worldSize: WorldSize;
  setWorldSize: (size: WorldSize) => void;
}

const SIZE_DESCRIPTIONS: Record<WorldSize, { title: string; blurb: string }> = {
  small: {
    title: "Small",
    blurb: "Quick start — fewer competitors, faster world generation",
  },
  medium: {
    title: "Medium",
    blurb: "Balanced world — moderate competition and performance",
  },
  large: {
    title: "Large",
    blurb: "Full world — maximum competition, richest database",
  },
};

export function StepWorldSize({ worldSize, setWorldSize }: StepWorldSizeProps) {
  const sizes: WorldSize[] = ["small", "medium", "large"];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground font-[family-name:var(--font-body)]">
        Choose the size of your racing world. This affects the number of NPC stables, horses, and
        jockeys generated at game start and maintained throughout gameplay.
      </p>

      <div className="grid gap-3">
        {sizes.map((size) => {
          const config = WORLD_SIZE_CONFIGS[size];
          const desc = SIZE_DESCRIPTIONS[size];
          const totalStables =
            config.stables.elite.count +
            config.stables.mid.count +
            config.stables.budget.count +
            config.stables.filler.count;
          const isSelected = worldSize === size;

          return (
            <button
              key={size}
              type="button"
              onClick={() => setWorldSize(size)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-muted bg-card/40 hover:border-surface-hover"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className={`font-[family-name:var(--font-display)] text-lg ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {desc.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{desc.blurb}</p>
                </div>
                {isSelected && (
                  <span className="text-primary text-xs uppercase tracking-wide">Selected</span>
                )}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs tabular-nums text-muted-foreground">
                <div>
                  <dt className="uppercase tracking-wider">Stables</dt>
                  <dd className="text-foreground">{totalStables}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider">Jockeys</dt>
                  <dd className="text-foreground">{config.jockeyCount}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider">Free Agent Min</dt>
                  <dd className="text-foreground">{config.freeAgentMin}</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>
    </div>
  );
}
