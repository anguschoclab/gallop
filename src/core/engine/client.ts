/**
 * client.ts - EngineClient: main-thread command queue and result router.
 *
 * Guarantees:
 * - at most one mutating command in flight (queue serializes the rest)
 * - idempotent submission: a duplicate commandId returns the same promise
 * - progress events are read-model updates only; terminal events carry the
 *   committed state + engine revision
 * - a late event for a superseded/cancelled command resolves its own promise
 *   but can never produce a second terminal outcome
 */

import type { GameState } from "@/game/types";
import type { CommandId, EngineCommand, EngineEvent, Revision, TerminalEvent } from "./protocol";
/** Transport abstraction: worker-backed or in-process. */
export interface EngineTransport {
  submit(message: EngineCommand | { kind: "cancel"; commandId: CommandId }): void;
  onEvent(handler: (event: EngineEvent) => void): void;
  /** Release transport resources (terminate worker). */
  dispose?(): void;
}

/** Command payloads the client can submit (commandId/baseRevision added at dispatch). */
export type SubmitOptions =
  | {
      kind?: "advance";
      days: number;
      headless: boolean;
      state: GameState;
      telemetry?: boolean;
      checksum?: boolean;
    }
  | {
      kind: "resolveLiveRace";
      state: GameState;
      raceId: string;
      result: { horseId: string; position: number; time: number }[];
      runners?: import("@/core/race/types").RaceRunner[];
      factorLedgers?: Record<string, import("@/core/race/factorLedger").RunnerFactorLedger>;
      snapshots?: import("@/core/race/engine/raceSnapshotTypes").RaceSnapshot[];
    };

interface QueuedCommand {
  options: SubmitOptions;
  pending: PendingCommand;
}

export type AdvanceResult =
  | {
      status: "completed";
      revision: Revision;
      state: GameState;
      logs: { day: number; text: string }[];
      daysAdvanced: number;
      checksum?: string;
      telemetry?: import("@/core/time/telemetry").TelemetryReport;
    }
  | {
      status: "interrupted";
      revision: Revision;
      state: GameState;
      logs: { day: number; text: string }[];
      daysAdvanced: number;
      raceId: string;
      checksum?: string;
      telemetry?: import("@/core/time/telemetry").TelemetryReport;
    }
  | {
      status: "cancelled";
      revision: Revision;
      state: GameState;
      logs: { day: number; text: string }[];
      daysAdvanced: number;
      telemetry?: import("@/core/time/telemetry").TelemetryReport;
    }
  | {
      status: "resolved";
      revision: Revision;
      state: GameState;
      raceId: string;
    }
  | { status: "rejected"; reason: string };

interface PendingCommand {
  commandId: CommandId;
  baseRevision: Revision;
  resolve: (r: AdvanceResult) => void;
  reject: (e: Error) => void;
  settled: boolean;
  promise: Promise<AdvanceResult>;
}

let commandCounter = 0;
function nextCommandId(): CommandId {
  commandCounter += 1;
  return `cmd-${Date.now().toString(36)}-${commandCounter}`;
}

export class EngineClient {
  private active: PendingCommand | null = null;
  private readonly queue: QueuedCommand[] = [];
  private readonly results = new Map<CommandId, PendingCommand>();
  private _revision: Revision = 0;
  private progressHandler: ((e: Extract<EngineEvent, { type: "progress" }>) => void) | null = null;

  constructor(private readonly transport: EngineTransport) {
    transport.onEvent((event) => this.handleEvent(event));
  }

  /** Revision of the most recently committed state. */
  get revision(): Revision {
    return this._revision;
  }

  /**
   * Adopt an external revision (e.g. after load/new game resets authority).
   * @param revision
   */
  setRevision(revision: Revision): void {
    this._revision = revision;
  }

  onProgress(handler: ((e: Extract<EngineEvent, { type: "progress" }>) => void) | null): void {
    this.progressHandler = handler;
  }

  /**
   * Submit an advance command. Idempotent by commandId — resubmitting a
   * commandId that is already in flight returns the same promise.
   * @param options
   * @param commandId
   */
  submit(options: SubmitOptions, commandId: CommandId = nextCommandId()): Promise<AdvanceResult> {
    const existing = this.results.get(commandId);
    if (existing) return existing.promise;

    let resolve!: (r: AdvanceResult) => void;
    let reject!: (e: Error) => void;
    const promise = new Promise<AdvanceResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const pending: PendingCommand = {
      commandId,
      baseRevision: this._revision,
      resolve,
      reject,
      settled: false,
      promise,
    };
    this.results.set(commandId, pending);

    if (this.active) {
      this.queue.push({ options, pending });
    } else {
      this.dispatch(options, pending);
    }
    return promise;
  }

  /** Request cancellation of the active command (cooperative, checkpointed). */
  cancel(): void {
    if (this.active) {
      this.transport.submit({ kind: "cancel", commandId: this.active.commandId });
    }
  }

  /**
   * Fail the in-flight command and drain the queue (worker crash/restart).
   * @param error
   */
  failAll(error: Error): void {
    // Dequeue everything first: settle() drains the queue by dispatching,
    // which would submit new commands into a dead transport.
    const queued = this.queue.splice(0);
    if (this.active)
      this.settle(this.active, {
        type: "failed",
        commandId: this.active.commandId,
        error: error.message,
      });
    for (const { pending } of queued) {
      this.settle(pending, { type: "failed", commandId: pending.commandId, error: error.message });
    }
  }

  dispose(): void {
    this.transport.dispose?.();
  }

  private dispatch(options: SubmitOptions, pending: PendingCommand): void {
    this.active = pending;
    // baseRevision is captured at dispatch time so queued commands always
    // build on the latest committed revision.
    const command: EngineCommand =
      options.kind === "resolveLiveRace"
        ? {
            kind: "resolveLiveRace",
            commandId: pending.commandId,
            baseRevision: this._revision,
            state: options.state,
            raceId: options.raceId,
            result: options.result,
            runners: options.runners,
            factorLedgers: options.factorLedgers,
            snapshots: options.snapshots,
          }
        : {
            kind: "advance",
            commandId: pending.commandId,
            baseRevision: this._revision,
            state: options.state,
            days: options.days,
            headless: options.headless,
            telemetry: options.telemetry,
            checksum: options.checksum,
          };
    this.transport.submit(command);
  }

  private handleEvent(event: EngineEvent): void {
    if (event.type === "progress") {
      // Progress is a read-model update; ignore events for non-active commands.
      if (this.active && event.commandId === this.active.commandId) {
        this.progressHandler?.(event);
      }
      return;
    }

    const pending = this.results.get(event.commandId);
    if (!pending) return; // unknown command — stale event, ignore

    switch (event.type) {
      case "accepted":
        return;
      case "completed":
      case "interrupted":
      case "cancelled":
      case "resolved":
        // Terminal commit events carry a new authoritative revision.
        this._revision = event.revision;
        this.settle(pending, event);
        break;
      case "rejected":
      case "failed":
        this.settle(pending, event);
        break;
    }
  }

  private settle(pending: PendingCommand, event: TerminalEvent): void {
    if (pending.settled) return; // exactly-once
    pending.settled = true;
    this.results.delete(pending.commandId);
    if (this.active === pending) this.active = null;

    switch (event.type) {
      case "completed":
        pending.resolve({
          status: "completed",
          revision: event.revision,
          state: event.state,
          logs: event.logs,
          daysAdvanced: event.daysAdvanced,
          checksum: event.checksum,
          telemetry: event.telemetry,
        });
        break;
      case "interrupted":
        pending.resolve({
          status: "interrupted",
          revision: event.revision,
          state: event.state,
          logs: event.logs,
          daysAdvanced: event.daysAdvanced,
          raceId: event.raceId,
          checksum: event.checksum,
          telemetry: event.telemetry,
        });
        break;
      case "cancelled":
        pending.resolve({
          status: "cancelled",
          revision: event.revision,
          state: event.state,
          logs: event.logs,
          daysAdvanced: event.daysAdvanced,
          telemetry: event.telemetry,
        });
        break;
      case "resolved":
        pending.resolve({
          status: "resolved",
          revision: event.revision,
          state: event.state,
          raceId: event.raceId,
        });
        break;
      case "rejected":
        pending.resolve({ status: "rejected", reason: event.reason });
        break;
      case "failed":
        pending.reject(new Error(event.error));
        break;
    }

    // Drain queue.
    const next = this.queue.shift();
    if (next) this.dispatch(next.options, next.pending);
  }
}
