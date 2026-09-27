/**
 * importedRealWorld.ts - Player-uploaded real-world racing data
 *
 * Parses CSV/JSON uploads of real race results, track records and horse careers,
 * persists them in browser storage (never in the game save) and exposes a tiny
 * subscribable store so the Almanac and Scouting Insights can show them
 * alongside the built-in reference records.
 */

import { useSyncExternalStore } from "react";
import type { RealWorldRecord } from "./realWorldRecords";

export interface ImportedCareer {
  id: string;
  horse: string;
  country: string;
  gender: string;
  foaled?: number;
  starts: number;
  wins: number;
  places: number;
  earnings: number;
  g1Wins: number;
  note: string;
}

export interface ImportedDataset {
  records: RealWorldRecord[];
  careers: ImportedCareer[];
  importedAt: string | null;
  fileName: string | null;
}

export interface ImportResult {
  records: number;
  careers: number;
  skipped: string[];
}

const STORAGE_KEY = "gallop.importedRealWorld.v1";
const EMPTY: ImportedDataset = { records: [], careers: [], importedAt: null, fileName: null };

let current: ImportedDataset = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load(): ImportedDataset {
  if (loaded || typeof window === "undefined") return current;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) current = { ...EMPTY, ...(JSON.parse(raw) as ImportedDataset) };
  } catch {
    current = EMPTY;
  }
  return current;
}

function commit(next: ImportedDataset) {
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full or unavailable — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function getImportedDataset(): ImportedDataset {
  return load();
}

export function clearImportedDataset() {
  commit(EMPTY);
}

/** React hook: current imported dataset (empty during SSR). */
export function useImportedRealWorld(): ImportedDataset {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => load(),
    () => EMPTY,
  );
}

// ---------------------------------------------------------------- parsing

/** Minimal RFC-4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0].map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  );
  return nonEmpty.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return o;
  });
}

/** Parse "1:59.40", "2:20.6", "119.4" or "1.59.40" into seconds. */
export function parseRaceTime(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const parts = v.split(/[:.]/).map(Number);
  if (v.includes(":")) {
    const [m, rest] = v.split(":");
    const s = Number(m) * 60 + Number(rest);
    return Number.isFinite(s) && s > 0 ? s : null;
  }
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return parts[0] * 60 + parts[1] + Number(`0.${v.split(".")[2]}`);
  }
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Parse a distance: "2400", "2400m", "12f", "1.25mi". Returns metres. */
export function parseDistance(value: string): number | null {
  const v = value.trim().toLowerCase();
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (v.endsWith("f")) return Math.round(n * 201.168);
  if (v.endsWith("mi") || v.endsWith("mile") || v.endsWith("miles")) return Math.round(n * 1609.34);
  return Math.round(n);
}

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function normSurface(v: string): RealWorldRecord["surface"] | null {
  const s = v.trim().toLowerCase();
  if (s.startsWith("t") || s === "grass") return "Turf";
  if (s.startsWith("d")) return "Dirt";
  if (s.startsWith("s") || s.startsWith("a") || s === "polytrack" || s === "tapeta")
    return "Synthetic";
  return null;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type Row = Record<string, string>;
const pick = (r: Row, ...keys: string[]) => {
  for (const k of keys) if (r[k] !== undefined && r[k] !== "") return r[k];
  return "";
};

function rowKind(r: Row): "result" | "record" | "career" | null {
  const k = pick(r, "kind", "type").toLowerCase();
  if (k.startsWith("car")) return "career";
  if (k.includes("record")) return "record";
  if (k.startsWith("res") || k.startsWith("race")) return "result";
  if (pick(r, "starts", "runs")) return "career";
  if (pick(r, "time", "seconds")) return "result";
  return null;
}

/**
 * Turn parsed rows into records and careers.
 *
 * @param rows - Flat rows (lower_snake_case keys)
 */
export function rowsToDataset(rows: Row[]): {
  records: RealWorldRecord[];
  careers: ImportedCareer[];
  skipped: string[];
} {
  const records: RealWorldRecord[] = [];
  const careers: ImportedCareer[] = [];
  const skipped: string[] = [];
  rows.forEach((r, i) => {
    const line = `Row ${i + 2}`;
    const horse = pick(r, "horse", "name", "horse_name");
    if (!horse) return void skipped.push(`${line}: missing horse name`);
    const kind = rowKind(r);
    if (kind === "career") {
      careers.push({
        id: `imp-c-${slug(horse)}-${i}`,
        horse,
        country: pick(r, "country"),
        gender: pick(r, "gender", "sex") || "—",
        foaled: num(pick(r, "foaled", "born", "year_foaled")) || undefined,
        starts: num(pick(r, "starts", "runs")),
        wins: num(pick(r, "wins")),
        places: num(pick(r, "places", "placed")),
        earnings: num(pick(r, "earnings", "prize_money", "earnings_usd")),
        g1Wins: num(pick(r, "g1_wins", "group1_wins", "grade1_wins")),
        note: pick(r, "note", "notes"),
      });
      return;
    }
    if (!kind) return void skipped.push(`${line}: no time or starts column`);
    const seconds = parseRaceTime(pick(r, "time", "seconds"));
    const distance = parseDistance(pick(r, "distance", "distance_m", "distance_meters"));
    const surface = normSurface(pick(r, "surface"));
    const track = pick(r, "track", "course", "racecourse");
    if (!seconds || !distance || !surface || !track)
      return void skipped.push(`${line}: needs track, surface, distance and time`);
    const year = num(pick(r, "year")) || num(pick(r, "date").slice(0, 4));
    records.push({
      id: `imp-${kind}-${slug(horse)}-${slug(track)}-${distance}-${i}`,
      source: "imported",
      horse,
      track,
      country: pick(r, "country"),
      race: pick(r, "race", "race_name") || (kind === "record" ? "Track record" : "Race"),
      surface,
      distanceMeters: distance,
      seconds,
      year,
      date: pick(r, "date") || undefined,
      note: pick(r, "note", "notes") || "Imported from your data.",
      isOfficialTrackRecord: kind === "record",
    });
  });
  return { records, careers, skipped };
}

/**
 * Parse an uploaded file's text (CSV or JSON) and store it.
 *
 * @param text - File contents
 * @param fileName - Original file name
 * @param mode - "replace" existing uploads, or "merge" with them
 */
export function importRealWorldText(
  text: string,
  fileName: string,
  mode: "replace" | "merge" = "replace",
): ImportResult {
  let rows: Row[];
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as unknown;
    const list: unknown[] = Array.isArray(parsed)
      ? parsed
      : [
          ...(((parsed as Record<string, unknown>).results as unknown[]) ?? []).map((x) => ({
            kind: "result",
            ...(x as object),
          })),
          ...(((parsed as Record<string, unknown>).records as unknown[]) ?? []).map((x) => ({
            kind: "record",
            ...(x as object),
          })),
          ...(((parsed as Record<string, unknown>).careers as unknown[]) ?? []).map((x) => ({
            kind: "career",
            ...(x as object),
          })),
        ];
    rows = list.map((o) => {
      const out: Row = {};
      for (const [k, v] of Object.entries(o as object))
        out[k.toLowerCase().replace(/[\s-]+/g, "_")] = v == null ? "" : String(v);
      return out;
    });
  } else {
    rows = parseCsv(text);
  }
  const { records, careers, skipped } = rowsToDataset(rows);
  const base = mode === "merge" ? load() : EMPTY;
  commit({
    records: [...base.records, ...records],
    careers: [...base.careers, ...careers],
    importedAt: new Date().toISOString(),
    fileName,
  });
  return { records: records.length, careers: careers.length, skipped };
}

export const IMPORT_TEMPLATE_CSV = `kind,horse,country,gender,foaled,track,race,surface,distance,time,year,starts,wins,places,earnings,g1_wins,note
result,Flightline,USA,Male,2018,Keeneland,Breeders' Cup Classic,Dirt,2012,2:00.05,2022,,,,,,Won by 8 1/4 lengths
record,Arrogate,USA,Male,2013,Saratoga,Travers Stakes,Dirt,10f,1:59.36,2016,,,,,,Saratoga 10f track record
career,Frankel,Great Britain,Male,2008,,,,,,,14,14,0,2998302,10,Unbeaten; earnings in GBP
`;
