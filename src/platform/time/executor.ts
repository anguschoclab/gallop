/**
 * executor.ts - The single production simulation executor.
 *
 * All world advancement — worker single-day, worker range batches, direct unit
 * tests, and the in-process adapter — flows through `SimulationExecutor`.
 * There is exactly one implementation of day semantics; callers never
 * construct PipelineContext themselves.
 *
 * Responsibilities:
 * - one transaction per day (context build, RNG streams, indexes, logs)
 * - cadence gating via compiled schedule descriptors
 * - append-only logs/events, finalized once per commit
 * - year-rollover and end-of-day resets owned by finalization hooks
 * - player-race interruption and cancellation checkpoints at day boundaries
 * - opt-in telemetry spans per phase/day/commit
 */

import type { GameState } from "@/platform/game/types";
import type { PipelineContext } from "@/platform/time/pipeline";
import type { PhaseDescriptor, CompiledSchedule } from "@/platform/time/scheduler";
import { compileSchedule, phaseIsDue } from "@/platform/time/scheduler";
import type { AdvancePlan, Interruption } from "@/platform/time/advancePlan";
import { interruptionForDay } from "@/platform/time/advancePlan";
import { createRng, hashStr } from "@/shared/common/rng";
import { getCurrentYear } from "@/domains/race/simulation/schedule";
import type { TelemetrySink } from "@/platform/time/telemetry";
import { createTelemetry } from "@/platform/time/telemetry";
import { checksumState } from "@/platform/time/checksum";
import { withUuidStream } from "@/shared/uuid/uuid";

export interface DayOutcome {
  state: GameState;
  logs: { day: number; text: string }[];
}

export interface RangeOutcome {
  state: GameState;
  logs: { day: number; text: string }[];
  daysAdvanced: number;
  interruption?: Interruption;
  cancelled: boolean;
  checksum?: string;
}

export interface ExecutorHooks {
  /** Called after each completed simulated day. Return false to cancel. */
  onDay?: (day: number, daysCompleted: number, totalDays: number) => boolean | void;
  /** Cooperative cancellation check evaluated at each day boundary. */
  shouldCancel?: () => boolean;
  /** Per-run telemetry sink override (command-level telemetry mode). */
  telemetry?: TelemetrySink;
  /** Compute a full-state checksum in the outcome (default true — production
   *  commands opt out since nothing verifies it; benches/tests opt in). */
  checksum?: boolean;
}

/**
 * Convert a descriptor list into an executor. `descriptors` is normally the
 * compiled production registry; tests may inject fake descriptors.
 */
export class SimulationExecutor {
  readonly schedule: CompiledSchedule;

  constructor(
    descriptors: PhaseDescriptor[],
    private readonly telemetry: TelemetrySink = createTelemetry(false),
  ) {
    this.schedule = compileSchedule(descriptors);
  }

  /**
   * Advance exactly one day. Centralizes context creation and finalization —
   * every entry point (worker, tests, in-process adapter) uses this.
   * @param state
   * @param newDay
   */
  runDay(state: GameState, newDay: number): DayOutcome {
    return this.runDayDetailed(state, newDay);
  }

  /**
   * Like runDay but also returns the raw impact buffers — for tests and for
   * tools that inspect the resolver trail.
   * @param state
   * @param newDay
   * @param telemetry
   */
  runDayDetailed(
    state: GameState,
    newDay: number,
    telemetry: TelemetrySink = this.telemetry,
  ): DayOutcome & { impacts: PipelineContext["impacts"]; impactLog: PipelineContext["impactLog"] } {
    return telemetry.span("day", () =>
      // All entity ids minted inside a day transaction draw from a per-day
      // seeded stream — same-seed runs are bit-identical at the checksum level.
      withUuidStream(createRng(hashStr(`uuid_${newDay}`)), () => {
        const context = this.buildContext(state, newDay, telemetry);
        const finalContext = this.executeDay(context, telemetry);
        const finalized = this.finalizeDay(finalContext, newDay);
        return {
          state: finalized.state,
          logs: finalContext.logs,
          impacts: finalContext.impacts,
          impactLog: finalContext.impactLog,
        };
      }),
    );
  }

  /**
   * Advance a planned range, stopping at interruptions or cancellation.
   * State chains day over day inside the transaction; logs accumulate.
   * @param state
   * @param plan
   * @param hooks
   */
  runRange(state: GameState, plan: AdvancePlan, hooks: ExecutorHooks = {}): RangeOutcome {
    return this.runRangeInternal(state, plan, hooks, null) as RangeOutcome;
  }

  /**
   * Async variant: awaits `hooks.yieldControl()` after each simulated day so
   * the host event loop can deliver cancellation messages mid-range. Required
   * for cooperative cancellation inside a Web Worker.
   * @param state
   * @param plan
   * @param hooks
   */
  async runRangeAsync(
    state: GameState,
    plan: AdvancePlan,
    hooks: ExecutorHooks & { yieldControl?: () => Promise<void> } = {},
  ): Promise<RangeOutcome> {
    return this.runRangeInternal(
      state,
      plan,
      hooks,
      hooks.yieldControl ?? null,
    ) as Promise<RangeOutcome>;
  }

  private runRangeInternal(
    state: GameState,
    plan: AdvancePlan,
    hooks: ExecutorHooks & { yieldControl?: () => Promise<void> },
    yieldControl: (() => Promise<void>) | null,
  ): RangeOutcome | Promise<RangeOutcome> {
    const totalDays = plan.targetDay - plan.fromDay;
    const allLogs: { day: number; text: string }[] = [];
    let current = state;
    let daysAdvanced = 0;
    let interruption: Interruption | undefined;
    let cancelled = false;

    const finish = (): RangeOutcome => ({
      state: current,
      logs: allLogs,
      daysAdvanced,
      interruption,
      cancelled,
      checksum: hooks.checksum === false ? undefined : checksumState(current),
    });

    const step = (i: number): RangeOutcome | Promise<RangeOutcome> => {
      for (; i < totalDays; i++) {
        const nextDay = current.day + 1;

        // Interruption checkpoint: player race gate (unless headless).
        const hit = interruptionForDay(plan, current, nextDay);
        if (hit) {
          interruption = hit;
          return finish();
        }

        // Cooperative cancellation checkpoint at every day boundary.
        if (hooks.shouldCancel?.()) {
          cancelled = true;
          return finish();
        }

        const { state: dayState, logs } = this.runDayDetailed(
          current,
          nextDay,
          hooks.telemetry ?? this.telemetry,
        );
        current = dayState;
        allLogs.push(...logs);
        daysAdvanced++;

        if (hooks.onDay?.(nextDay, daysAdvanced, totalDays) === false) {
          cancelled = true;
          return finish();
        }

        if (yieldControl) {
          // Resume the loop after the host event loop turn.
          return yieldControl().then(() => step(i + 1));
        }
      }
      return finish();
    };

    return step(0);
  }

  /**
   * Build the day transaction context: indexes, RNG, buffers.
   * @param state
   * @param newDay
   * @param telemetry
   */
  private buildContext(
    state: GameState,
    newDay: number,
    telemetry: TelemetrySink = this.telemetry,
  ): PipelineContext {
    return telemetry.span("context", () => {
      const previousDay = state.day;
      // Year rollover: filter expired Win-and-You're-In qualifications once.
      const currentYear = getCurrentYear(newDay);
      const previousYear = getCurrentYear(previousDay);
      let horses = state.horses;
      if (currentYear > previousYear) {
        horses = Object.fromEntries(
          Object.values(horses).map((h) =>
            h.winAndYouInQualified
              ? [
                  h.id,
                  {
                    ...h,
                    winAndYouInQualified: h.winAndYouInQualified.filter(
                      (q: { year: number }) => q.year >= currentYear,
                    ),
                  },
                ]
              : [h.id, h],
          ),
        );
      }

      return {
        previousDay,
        newDay,
        state: { ...state, horses },
        logs: [],
        dailyRng: createRng(hashStr(`daily_${newDay}`)),
        intents: state.pendingIntents || [],
        impacts: [],
        impactLog: [],
        horseMap: new Map(Object.values(horses).map((h) => [h.id, h])),
        raceMap: new Map(Object.values(state.races).map((r) => [r.id, r])),
        stableMap: new Map((state.npcStables ?? []).map((s) => [s.id, s])),
        jockeyMap: new Map((state.jockeys ?? []).map((j) => [j.id, j])),
      };
    });
  }

  /**
   * Execute the compiled schedule for one day. Cadence-gated phases are
   * skipped when not due; each phase runs inside a telemetry span.
   * @param context
   * @param telemetry
   */
  private executeDay(
    context: PipelineContext,
    telemetry: TelemetrySink = this.telemetry,
  ): PipelineContext {
    // The compiled schedule is already in deterministic execution order —
    // iterate descriptors directly instead of allocating wrapper phase
    // objects every day.
    let ctx = context;
    for (const d of this.schedule.phases) {
      if (!phaseIsDue(d, ctx)) {
        telemetry.count(`skipped:${d.id}`);
        continue;
      }
      if (d.phase.skipIf?.(ctx)) continue;
      ctx = telemetry.span(`phase:${d.id}`, () => d.phase.execute(ctx));
    }
    return ctx;
  }

  /**
   * End-of-day finalization owned by the executor (not the caller).
   * @param context
   * @param newDay
   */
  private finalizeDay(context: PipelineContext, newDay: number): PipelineContext {
    return {
      ...context,
      state: {
        ...context.state,
        day: newDay,
        pendingIntents: [],
        trainingUsed: {},
      },
    };
  }
}
