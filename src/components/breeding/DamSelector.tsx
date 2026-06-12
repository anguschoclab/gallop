/**
 * DamSelector.tsx - Dam selection dropdown for breeding
 *
 * Extracted from BreedingShedTab.tsx.
 */

import { JargonTooltip } from "@/components/ui/JargonTooltip";
import type { Horse } from "@/game/types";

interface DamSelectorProps {
  damId: string;
  onChange: (id: string) => void;
  femalesToBreed: Horse[];
}

export function DamSelector({ damId, onChange, femalesToBreed }: DamSelectorProps) {
  return (
    <div>
      <label className="text-xs text-cream-muted">
        <JargonTooltip term="Dam">Dam</JargonTooltip>
      </label>
      <select
        className="w-full border border-gold-muted rounded-md px-3 py-2 bg-t800 text-cream text-sm"
        value={damId}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select dam…</option>
        {femalesToBreed.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} (age {Math.floor(h.age)}){h.bruceLoweFamily ? ` • BL${h.bruceLoweFamily}` : ""}{" "}
            • {Math.round(h.distanceAptitude)}m
          </option>
        ))}
      </select>
    </div>
  );
}
