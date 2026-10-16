/**
 * protocol.ts - Revisioned authoritative engine command protocol.
 *
 * The store submits commands; the SimulationEngine executes them serially and
 * emits ordered events. Every mutating command carries a `commandId` and the
 * `baseRevision` it was issued against. The engine rejects commands whose
 * base revision is stale, and the client rejects terminal events that do not
 * match the in-flight command — making stale, duplicate, partial, and
 * post-cancellation commits impossible.
 */

import type { GameState } from "@/game/types";

export type CommandId = string;
export type Revision = number;

/** Advance the world N days (may interrupt on a player race / cancel). */
export interface AdvanceCommand {
  kind: "advance";
  commandId: CommandId;
  baseRevision: Revision;
  /** Snapshot of authoritative state at baseRevision. */
  state: GameState;
  days: number;
  headless: boolean;
  /** When true the executor records span/counter telemetry for this command
   *  and the terminal event carries the aggregated report. */
  telemetry?: boolean;
  /** When true the terminal event carries a full-state checksum. Costs a
   *  canonical hash pass over committed state — benches/tests opt in. */
  checksum?: boolean;
}

/**
 * Commit a finished live race atomically: player-facing impacts plus the
 * race_resolution intent carrying the session's field, ledgers, and
 * snapshots. The authoritative writer applies them once, at a new revision.
 */
export interface ResolveLiveRaceCommand {
  kind: "resolveLiveRace";
  commandId: CommandId;
  baseRevision: Revision;
  state: GameState;
  raceId: string;
  result: { horseId: string; position: number; time: number }[];
  runners?: import("@/core/race/types").RaceRunner[];
  factorLedgers?: Record<string, import("@/core/race/factorLedger").RunnerFactorLedger>;
  snapshots?: import("@/core/race/engine/raceSnapshotTypes").RaceSnapshot[];
}

export type EngineCommand = AdvanceCommand | ResolveLiveRaceCommand;

export type RejectReason =
  "malformed" | "stale_base_revision" | "duplicate_command" | "engine_busy";

export type EngineEvent =
  | { type: "accepted"; commandId: CommandId }
  | {
      type: "progress";
      commandId: CommandId;
      day: number;
      daysCompleted: number;
      totalDays: number;
    }
  | {
      type: "completed";
      commandId: CommandId;
      revision: Revision;
      state: GameState;
      logs: { day: number; text: string }[];
      daysAdvanced: number;
      checksum?: string;
      telemetry?: import("@/core/time/telemetry").TelemetryReport;
    }
  | {
      type: "interrupted";
      commandId: CommandId;
      revision: Revision;
      state: GameState;
      logs: { day: number; text: string }[];
      daysAdvanced: number;
      raceId: string;
      checksum?: string;
      telemetry?: import("@/core/time/telemetry").TelemetryReport;
    }
  | {
      type: "cancelled";
      commandId: CommandId;
      revision: Revision;
      state: GameState;
      logs: { day: number; text: string }[];
      daysAdvanced: number;
      telemetry?: import("@/core/time/telemetry").TelemetryReport;
    }
  | {
      type: "resolved";
      commandId: CommandId;
      revision: Revision;
      state: GameState;
      raceId: string;
    }
  | { type: "rejected"; commandId: CommandId; reason: RejectReason }
  | { type: "failed"; commandId: CommandId; error: string };

export type TerminalEvent = Extract<
  EngineEvent,
  { type: "completed" | "interrupted" | "cancelled" | "resolved" | "rejected" | "failed" }
>;

/**
 * Validate a raw message as an EngineCommand. Returns null if malformed.
 * @param raw
 */
export function parseCommand(raw: unknown): EngineCommand | null {
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.commandId !== "string" || c.commandId.length === 0) return null;
  if (!Number.isInteger(c.baseRevision) || (c.baseRevision as number) < 0) return null;
  if (typeof c.state !== "object" || c.state === null) return null;
  if (c.kind === "advance") {
    if (!Number.isInteger(c.days) || (c.days as number) <= 0) return null;
    if (typeof c.headless !== "boolean") return null;
    return c as unknown as EngineCommand;
  }
  if (c.kind === "resolveLiveRace") {
    if (typeof c.raceId !== "string" || c.raceId.length === 0) return null;
    if (!Array.isArray(c.result)) return null;
    return c as unknown as EngineCommand;
  }
  return null;
}

/**
 * Validate a raw message as a cancellation request.
 * @param raw
 */
export function parseCancel(raw: unknown): { commandId: CommandId } | null {
  if (typeof raw !== "object" || raw === null) return null;
  const c = raw as Record<string, unknown>;
  if (c.kind !== "cancel" || typeof c.commandId !== "string") return null;
  return { commandId: c.commandId };
}
