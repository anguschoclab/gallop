/**
 * trackFilterPresets.ts — Saved filter combinations for Course Histories.
 *
 * A preset stores a date range, race type and stable so a common view can be
 * re-applied in one click. Pure list helpers; the page persists the list.
 */

export interface TrackFilterValues {
  fromDay: string;
  toDay: string;
  raceType: string;
  stableId: string;
}

export interface TrackFilterPreset extends TrackFilterValues {
  id: string;
  name: string;
  /** Display name of the stable when the preset was saved. */
  stableName?: string;
}

export const MAX_TRACK_FILTER_PRESETS = 12;
export const TRACK_FILTER_PRESETS_STORAGE_KEY = "gallop.trackHistoryFilterPresets";

export const EMPTY_TRACK_FILTERS: TrackFilterValues = {
  fromDay: "",
  toDay: "",
  raceType: "all",
  stableId: "all",
};

function presetId(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * Save a preset; a preset with the same name is replaced and moves to the front.
 * @param presets
 * @param name
 * @param filters
 * @param stableName
 */
export function savePreset(
  presets: TrackFilterPreset[],
  name: string,
  filters: TrackFilterValues,
  stableName?: string,
): TrackFilterPreset[] {
  const trimmed = name.trim();
  if (!trimmed) return presets;
  const id = presetId(trimmed);
  const next: TrackFilterPreset = { id, name: trimmed, ...filters, stableName };
  return [next, ...presets.filter((p) => p.id !== id)].slice(0, MAX_TRACK_FILTER_PRESETS);
}

export function removePreset(presets: TrackFilterPreset[], id: string): TrackFilterPreset[] {
  return presets.filter((p) => p.id !== id);
}

/**
 * Short human summary, e.g. "Days 10–90 · G1 · Godolphin".
 * @param p
 */
export function describePreset(p: TrackFilterPreset): string {
  const parts: string[] = [];
  if (p.fromDay || p.toDay) parts.push(`Days ${p.fromDay || "first"}–${p.toDay || "latest"}`);
  if (p.raceType !== "all") parts.push(p.raceType);
  if (p.stableId !== "all") parts.push(p.stableName ?? "One stable");
  return parts.length ? parts.join(" · ") : "All races";
}

/**
 * Read presets from stored JSON, dropping anything malformed.
 * @param raw
 */
export function parsePresets(raw: string | null): TrackFilterPreset[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (p): p is TrackFilterPreset =>
          !!p &&
          typeof p === "object" &&
          typeof (p as TrackFilterPreset).id === "string" &&
          typeof (p as TrackFilterPreset).name === "string" &&
          typeof (p as TrackFilterPreset).fromDay === "string" &&
          typeof (p as TrackFilterPreset).toDay === "string" &&
          typeof (p as TrackFilterPreset).raceType === "string" &&
          typeof (p as TrackFilterPreset).stableId === "string",
      )
      .slice(0, MAX_TRACK_FILTER_PRESETS);
  } catch {
    return [];
  }
}
