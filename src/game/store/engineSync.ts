/**
 * engineSync.ts — store ↔ engine world synchronization.
 *
 * The engine retains an authoritative world (seeded by an explicit loadWorld
 * or the last committed state). Instead of shipping a full GameState with
 * every command — megabytes of structured-clone work per advance — the store
 * tracks the last committed state and compares engine-owned fields by
 * identity. When every field is still the exact object the engine committed,
 * the worlds are provably identical (both sides treat state immutably) and
 * the command omits its `state` payload entirely. Any divergence sends a
 * full resync snapshot.
 *
 * Two field classes never gate sync:
 *  - SESSION_KEYS: store-only bookkeeping (execution UI state, revision/
 *    generation counters) — stripped from snapshots, unknown to the engine.
 *  - UNSYNCED_FIELDS: `log` — the store enriches the committed log with
 *    phase lines and upkeep entries after each commit; the engine only
 *    prepends onto it (weatherPhase), so staleness is harmless.
 */

import type { GameState } from "@/game/types";
import type { StoreType } from "./types";

const SESSION_KEYS = new Set<string>([
  "execution",
  "engineRevision",
  "engineGeneration",
  "lastFrameTime",
]);

const UNSYNCED_FIELDS = new Set<string>(["log"]);

/**
 * The world the engine currently holds — the last state it committed, or a
 * snapshot explicitly loaded. `null` means the engine has no world yet.
 */
let committedWorld: GameState | null = null;

/**
 * Record a state the engine now holds (a committed terminal result).
 * @param state
 */
export function noteCommittedWorld(state: GameState): void {
  committedWorld = state;
}

/** Forget the tracked world — call when engine authority resets/crashes. */
export function resetCommittedWorld(): void {
  committedWorld = null;
}

/**
 * True when the store's engine-owned fields are identity-equal to the world
 * the engine retains — meaning a command can safely omit `state`.
 * @param s
 */
export function engineWorldSynced(s: StoreType): boolean {
  if (!committedWorld) return false;
  const store = s as unknown as Record<string, unknown>;
  const committed = committedWorld as unknown as Record<string, unknown>;
  for (const key of Object.keys(committed)) {
    if (SESSION_KEYS.has(key) || UNSYNCED_FIELDS.has(key)) continue;
    if (store[key] !== committed[key]) return false;
  }
  return true;
}
