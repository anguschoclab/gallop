/**
 * ScoutingThresholdControls.tsx - Editable threshold set for scouting
 *
 * Renders every numeric threshold plus gender/freshness/fee options for a
 * ScoutingThresholds object. Used both for manual bulk scouting filters and
 * for editing a standing assignment.
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { THRESHOLD_FIELDS, type ScoutingThresholds } from "@/core/npc/scoutingThresholds";

interface Props {
  value: ScoutingThresholds;
  onChange: (next: ScoutingThresholds) => void;
  /** Hide the pool selector when the parent already owns pool selection. */
  showPool?: boolean;
}

export function ScoutingThresholdControls({ value, onChange, showPool = true }: Props) {
  const patch = (p: Partial<ScoutingThresholds>) => onChange({ ...value, ...p });

  const numberField = (key: keyof ScoutingThresholds, label: string, step: number, max: number) => {
    const v = value[key] as number | null;
    return (
      <div key={String(key)} className="space-y-1">
        <Label
          htmlFor={`threshold-${String(key)}`}
          className="font-mono text-[9px] uppercase tracking-widest text-cream/40"
        >
          {label}
        </Label>
        <Input
          id={`threshold-${String(key)}`}
          type="number"
          inputMode="numeric"
          step={step}
          max={max}
          placeholder="Any"
          className="h-8 text-xs"
          value={v ?? ""}
          onChange={(e) =>
            patch({
              [key]: e.target.value === "" ? null : Number(e.target.value),
            } as Partial<ScoutingThresholds>)
          }
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {showPool && (
          <div className="space-y-1">
            <Label className="font-mono text-[9px] uppercase tracking-widest text-cream/40">
              Pool
            </Label>
            <Select
              value={value.pool}
              onValueChange={(v) => patch({ pool: v as ScoutingThresholds["pool"] })}
            >
              <SelectTrigger className="h-8 text-xs" aria-label="Scouting pool">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="npc">Rival stables</SelectItem>
                <SelectItem value="market">Open market</SelectItem>
                <SelectItem value="all">All horses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {THRESHOLD_FIELDS.map((f) => numberField(f.key, f.label, f.step, f.max))}

        {numberField("maxCostPerHorse", "Max fee per horse", 100, 100000)}

        <div className="space-y-1">
          <Label className="font-mono text-[9px] uppercase tracking-widest text-cream/40">
            Gender
          </Label>
          <Select
            value={value.gender}
            onValueChange={(v) => patch({ gender: v as ScoutingThresholds["gender"] })}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Gender threshold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="female">Fillies &amp; mares</SelectItem>
              <SelectItem value="male">Colts, horses &amp; geldings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="font-mono text-[9px] uppercase tracking-widest text-cream/40">
            Report status
          </Label>
          <Select
            value={value.freshness}
            onValueChange={(v) => patch({ freshness: v as ScoutingThresholds["freshness"] })}
          >
            <SelectTrigger className="h-8 text-xs" aria-label="Report freshness threshold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="unscouted">Never scouted</SelectItem>
              <SelectItem value="stale">Stale reports</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {value.freshness === "stale" && numberField("staleAfterDays", "Stale after (days)", 1, 365)}
      </div>
    </div>
  );
}
