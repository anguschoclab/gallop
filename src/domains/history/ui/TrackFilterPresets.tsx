/**
 * TrackFilterPresets.tsx — Save and re-apply Course Histories filter combos.
 */

import { useEffect, useState } from "react";
import { Bookmark, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  TRACK_FILTER_PRESETS_STORAGE_KEY,
  describePreset,
  parsePresets,
  removePreset,
  savePreset,
  type TrackFilterPreset,
  type TrackFilterValues,
} from "@/domains/history/model/trackFilterPresets";

interface Props {
  current: TrackFilterValues;
  currentStableName?: string;
  canSave: boolean;
  onApply: (filters: TrackFilterValues) => void;
}

export function TrackFilterPresets({ current, currentStableName, canSave, onApply }: Props) {
  const [presets, setPresets] = useState<TrackFilterPreset[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setPresets(parsePresets(window.localStorage.getItem(TRACK_FILTER_PRESETS_STORAGE_KEY)));
  }, []);

  const persist = (next: TrackFilterPreset[]) => {
    setPresets(next);
    window.localStorage.setItem(TRACK_FILTER_PRESETS_STORAGE_KEY, JSON.stringify(next));
  };

  const isActive = (p: TrackFilterPreset) =>
    p.fromDay === current.fromDay &&
    p.toDay === current.toDay &&
    p.raceType === current.raceType &&
    p.stableId === current.stableId;

  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase text-muted-foreground">Saved filters</span>
        {presets.length === 0 && (
          <span className="text-xs text-muted-foreground">None yet — set filters and save them.</span>
        )}
        {presets.map((p) => (
          <span key={p.id} className="inline-flex items-center">
            <Button
              type="button"
              size="sm"
              variant={isActive(p) ? "default" : "outline"}
              className="h-7 rounded-r-none px-2.5 text-xs"
              title={describePreset(p)}
              onClick={() =>
                onApply({ fromDay: p.fromDay, toDay: p.toDay, raceType: p.raceType, stableId: p.stableId })
              }
            >
              {p.name}
              <span className="ml-1.5 text-[10px] opacity-70">{describePreset(p)}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-l-none border-l-0 px-1.5"
              aria-label={`Delete saved filter ${p.name}`}
              onClick={() => persist(removePreset(presets, p.id))}
            >
              <X className="h-3 w-3" />
            </Button>
          </span>
        ))}
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave || !name.trim()) return;
          persist(savePreset(presets, name, current, currentStableName));
          setName("");
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name these filters"
          aria-label="Saved filter name"
          className="h-8 max-w-[14rem] text-sm"
          maxLength={40}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!canSave || !name.trim()}>
          <Bookmark className="h-3.5 w-3.5" />
          Save filters
        </Button>
      </form>
    </div>
  );
}
