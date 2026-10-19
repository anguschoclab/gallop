/**
 * SireSelector.tsx - Sire selection dropdown for breeding
 *
 * Extracted from BreedingShedTab.tsx.
 */

import { JargonTooltip } from "@/domains/horse/ui/JargonTooltip";
import { formatCurrency } from "@/domains/breeding/application/breedingFacade";
import type { Horse } from "@/platform/game/types";

interface SireSelectorProps {
  sireId: string;
  onChange: (id: string) => void;
  availableStallions: Horse[];
}

export function SireSelector({ sireId, onChange, availableStallions }: SireSelectorProps) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">
        <JargonTooltip term="Sire">Sire</JargonTooltip>
      </label>
      <select
        className="w-full border border-border rounded-md px-3 py-2 bg-card text-foreground text-sm"
        value={sireId}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select sire…</option>
        {availableStallions.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} (age {Math.floor(h.age)})
            {h.bruceLoweFamily ? ` • Family ${h.bruceLoweFamily}` : ""} •{" "}
            {Math.round(h.distanceAptitude)}m • {formatCurrency(h.stud?.standingFee || 0)}
          </option>
        ))}
      </select>
    </div>
  );
}
