/**
 * SireSelector.tsx - Sire selection dropdown for breeding
 *
 * Extracted from BreedingShedTab.tsx.
 */

import { JargonTooltip } from "@/components/ui/JargonTooltip";
import { formatCurrency } from "@/core/common/formatting";
import type { Horse } from "@/game/types";

interface SireSelectorProps {
  sireId: string;
  onChange: (id: string) => void;
  availableStallions: Horse[];
}

export function SireSelector({ sireId, onChange, availableStallions }: SireSelectorProps) {
  return (
    <div>
      <label className="text-xs text-cream-muted">
        <JargonTooltip term="Sire">Sire</JargonTooltip>
      </label>
      <select
        className="w-full border border-gold-muted rounded-md px-3 py-2 bg-t800 text-cream text-sm"
        value={sireId}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select sire…</option>
        {availableStallions.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} (age {Math.floor(h.age)}){h.bruceLoweFamily ? ` • BL${h.bruceLoweFamily}` : ""}{" "}
            • {Math.round(h.distanceAptitude)}m • ${formatCurrency(h.stud?.standingFee || 0)}
          </option>
        ))}
      </select>
    </div>
  );
}
