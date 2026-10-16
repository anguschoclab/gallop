/**
 * checksum.ts - Deterministic canonical checksum for simulation state.
 *
 * Produces a stable hash of the simulation-relevant fields of a GameState.
 * Key order, Map/Set iteration order, and incidental object shape do not
 * affect the checksum; presentation-only/transient fields are excluded.
 *
 * Used by the revisioned engine protocol to verify serial/parallel
 * equivalence and detect stale or divergent commits.
 */

import type { GameState } from "@/game/types";

/** Fields excluded from the checksum — presentation/transient only. */
const EXCLUDED_KEYS = new Set([
  "log",
  "execution",
  "engineRevision",
  "storeVersion",
  "lastFrameTime",
]);

/**
 * Rolling FNV-1a sink. Feeding the exact character sequence that
 * `canonicalize` would emit produces the identical hash — without
 * materializing the (multi-MB) canonical string of a large state.
 */
class Sink {
  private h = 0x811c9dc5;
  write(s: string): void {
    let h = this.h;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    this.h = h;
  }
  digest(): number {
    return this.h >>> 0;
  }
}

function fold(value: unknown, sink: Sink): void {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      sink.write(`num:${String(value)}`);
    } else if (value === undefined || typeof value === "function" || typeof value === "symbol") {
      sink.write("undef");
    } else {
      sink.write(JSON.stringify(value));
    }
    return;
  }
  if (Array.isArray(value)) {
    sink.write("[");
    for (let i = 0; i < value.length; i++) {
      if (i > 0) sink.write(",");
      fold(value[i], sink);
    }
    sink.write("]");
    return;
  }
  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([k, v]) => [canonicalize(k), canonicalize(v)] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    sink.write("map{");
    for (let i = 0; i < entries.length; i++) {
      if (i > 0) sink.write(",");
      sink.write(entries[i][0]);
      sink.write(":");
      sink.write(entries[i][1]);
    }
    sink.write("}");
    return;
  }
  if (value instanceof Set) {
    const items = [...value.values()].map(canonicalize).sort();
    sink.write("set{");
    for (let i = 0; i < items.length; i++) {
      if (i > 0) sink.write(",");
      sink.write(items[i]);
    }
    sink.write("}");
    return;
  }
  const keys = Object.keys(value as Record<string, unknown>)
    .filter((k) => !EXCLUDED_KEYS.has(k))
    .sort();
  sink.write("{");
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) sink.write(",");
    sink.write(JSON.stringify(keys[i]));
    sink.write(":");
    fold((value as Record<string, unknown>)[keys[i]], sink);
  }
  sink.write("}");
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      return `num:${String(value)}`;
    }
    if (value === undefined) return "undef";
    if (typeof value === "function" || typeof value === "symbol") return "undef";
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (value instanceof Map) {
    const entries = [...value.entries()]
      .map(([k, v]) => [canonicalize(k), canonicalize(v)] as const)
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return `map{${entries.map(([k, v]) => `${k}:${v}`).join(",")}}`;
  }
  if (value instanceof Set) {
    const items = [...value.values()].map(canonicalize).sort();
    return `set{${items.join(",")}}`;
  }
  const keys = Object.keys(value as Record<string, unknown>)
    .filter((k) => !EXCLUDED_KEYS.has(k))
    .sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`,
  );
  return `{${parts.join(",")}}`;
}

/**
 * Compute a deterministic checksum string for the simulation state.
 * Same logical state always produces the same checksum regardless of
 * object key order or intermediate copies.
 * @param state
 */
export function checksumState(state: GameState): string {
  const sink = new Sink();
  fold(state, sink);
  return sink.digest().toString(16).padStart(8, "0");
}

/**
 * Exposed for tests: canonical serialization without hashing.
 * @param state
 */
export function canonicalState(state: GameState): string {
  return canonicalize(state);
}
