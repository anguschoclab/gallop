/**
 * engine.ts - SimulationEngine: the single authoritative simulation writer.
 *
 * Runs inside the engine worker (or in-process via LocalTransport for tests /
 * worker-unavailable environments). Commands are validated, serialized, and
 * executed through SimulationExecutor. Exactly one terminal event is emitted
 * per accepted command; committed states carry a monotonically increasing
 * revision so late or stale outputs can never overwrite newer state.
 */

import type { GameState } from "@/game/types";
import { SimulationExecutor } from "@/core/time/executor";
import { buildAdvancePlan } from "@/core/time/advancePlan";
import { GAME_PHASE_DESCRIPTORS } from "@/core/time/phases/descriptors";
import { applyLiveRaceResolution } from "@/core/race/liveResolution";
import { createTelemetry } from "@/core/time/telemetry";
import {
  parseCommand,
  type CommandId,
  type EngineCommand,
  type EngineEvent,
  type Revision,
} from "./protocol";

export type EngineEmit = (event: EngineEvent) => void;

export class SimulationEngine {
  private readonly executor: SimulationExecutor;
  private revision: Revision = 0;
  private world: GameState | null = null;
  private activeId: CommandId | null = null;
  private cancelRequested = false;
  private readonly seenCommandIds = new Set<CommandId>();

  constructor(executor?: SimulationExecutor) {
    this.executor = executor ?? new SimulationExecutor(GAME_PHASE_DESCRIPTORS);
  }

  /** Current authoritative revision (monotonic, incremented per commit). */
  get currentRevision(): Revision {
    return this.revision;
  }

  /**
   * Submit a command for execution. Emits `accepted`, zero or more
   * `progress` events, then exactly one terminal event.
   * Rejected commands emit `rejected` and are never executed.
   *
   * Async: the engine yields to the host event loop between days so cancel
   * messages are delivered mid-range inside a worker.
   * @param raw
   * @param emit
   */
  async submit(raw: unknown, emit: EngineEmit): Promise<void> {
    const command = parseCommand(raw);
    if (!command) {
      const id =
        typeof raw === "object" && raw !== null
          ? String((raw as Record<string, unknown>).commandId ?? "")
          : "";
      emit({ type: "rejected", commandId: id, reason: "malformed" });
      return;
    }

    if (this.seenCommandIds.has(command.commandId)) {
      emit({ type: "rejected", commandId: command.commandId, reason: "duplicate_command" });
      return;
    }

    if (this.activeId !== null) {
      emit({ type: "rejected", commandId: command.commandId, reason: "engine_busy" });
      return;
    }

    // loadWorld rebases authority: it is the recovery path after a transport
    // restart, so it is exempt from the base-revision check.
    if (command.kind !== "loadWorld" && command.baseRevision !== this.revision) {
      emit({ type: "rejected", commandId: command.commandId, reason: "stale_base_revision" });
      return;
    }

    // Mutating commands need an authoritative world: either the snapshot
    // they carry or the retained world seeded by loadWorld/last commit.
    if (command.kind !== "loadWorld" && !command.state && !this.world) {
      emit({ type: "rejected", commandId: command.commandId, reason: "no_world_loaded" });
      return;
    }

    this.seenCommandIds.add(command.commandId);
    this.activeId = command.commandId;
    this.cancelRequested = false;
    emit({ type: "accepted", commandId: command.commandId });

    let terminal: EngineEvent;
    try {
      terminal = await this.execute(command, emit);
    } catch (error) {
      terminal = {
        type: "failed",
        commandId: command.commandId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    // Free the engine before emitting the terminal event — a client's settle
    // handler may synchronously dispatch the next queued command, and it must
    // not be rejected as "engine_busy" by the still-active id.
    this.activeId = null;
    this.cancelRequested = false;
    emit(terminal);
  }

  /**
   * Request cooperative cancellation of the active command.
   * @param commandId
   */
  cancel(commandId: CommandId): void {
    if (this.activeId === commandId) this.cancelRequested = true;
  }

  private async execute(command: EngineCommand, emit: EngineEmit): Promise<EngineEvent> {
    if (command.kind === "loadWorld") {
      // Adopt the supplied world at the supplied revision. Command-id
      // deduplication resets too — a load marks a new session/generation.
      this.world = command.state;
      this.revision = command.baseRevision;
      this.seenCommandIds.clear();
      return {
        type: "loaded",
        commandId: command.commandId,
        revision: this.revision,
      };
    }

    if (command.kind === "resolveLiveRace") {
      // Atomic live-race commit: player-facing impacts + the resolution
      // intent are applied once, at a new revision. A duplicate resolution
      // is a no-op state — the commit is still consistent.
      const state = applyLiveRaceResolution((command.state ?? this.world)!, command);
      this.revision += 1;
      this.world = state;
      return {
        type: "resolved",
        commandId: command.commandId,
        revision: this.revision,
        state,
        raceId: command.raceId,
      };
    }

    const plan = buildAdvancePlan((command.state ?? this.world)!, command.days, command.headless);
    const telemetry = createTelemetry(command.telemetry === true);
    const outcome = await this.executor.runRangeAsync((command.state ?? this.world)!, plan, {
      telemetry,
      checksum: command.checksum === true,
      shouldCancel: () => this.cancelRequested,
      // Yield to the macrotask queue so pending `cancel` messages are
      // processed at day boundaries.
      yieldControl: () => new Promise<void>((r) => setTimeout(r, 0)),
      onDay: (day, daysCompleted, totalDays) => {
        emit({
          type: "progress",
          commandId: command.commandId,
          day,
          daysCompleted,
          totalDays,
        });
      },
    });

    // Commit: a completed/interrupted/cancelled run commits the days that
    // actually advanced — never partial within-day state. The committed
    // state becomes the retained world for subsequent commands.
    this.revision += 1;
    const state = outcome.state as GameState;
    this.world = state;

    const telemetryReport = telemetry.enabled ? telemetry.report() : undefined;

    if (outcome.cancelled) {
      return {
        type: "cancelled",
        commandId: command.commandId,
        revision: this.revision,
        state,
        logs: outcome.logs,
        daysAdvanced: outcome.daysAdvanced,
        telemetry: telemetryReport,
      };
    }

    if (outcome.interruption) {
      return {
        type: "interrupted",
        commandId: command.commandId,
        revision: this.revision,
        state,
        logs: outcome.logs,
        daysAdvanced: outcome.daysAdvanced,
        raceId: outcome.interruption.raceId,
        checksum: outcome.checksum,
        telemetry: telemetryReport,
      };
    }

    return {
      type: "completed",
      commandId: command.commandId,
      revision: this.revision,
      state,
      logs: outcome.logs,
      daysAdvanced: outcome.daysAdvanced,
      checksum: outcome.checksum,
      telemetry: telemetryReport,
    };
  }
}
