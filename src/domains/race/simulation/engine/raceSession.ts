/**
 * raceSession.ts - RaceSimulationSession: the single fixed-step race kernel.
 *
 * Both consumers — headless `runRaceToCompletion` and the live viewer's RAF
 * loop — drive the same session, so live and headless outcomes are identical
 * for the same seed by construction (same runner order, same pace context,
 * same rng stream, same interpolation math).
 *
 * Session options tune the *surface* (snapshot cadence, pace milestones,
 * commentary/split hooks, max time); the per-tick physics are fixed.
 */

import type { CourseSpecification } from "@/shared/data/accessors/tracksAccessor";
import type { Rng } from "@/shared/common/types";
import { compareFinishOrder } from "@/domains/race/simulation/engine/compareFinishOrder";
import type {
  RaceSnapshot,
  PaceSnapshot,
  HorseSnapshot,
} from "@/domains/race/model/engine/raceSnapshotTypes";
import { stepRunner, computePaceContext } from "@/domains/race/simulation/engine/simulation";
import type { Runner, PaceContext } from "@/domains/race/simulation/engine/runnerBuilder";
import type { RunnerFactorLedger } from "@/domains/race/simulation/factorLedger";
import { DEFAULT_DT } from "@/domains/race/model/engine/constants";
import { SPLIT_FRACTIONS } from "@/domains/race/model/raceBroadcastConstants";

export interface RaceSessionOptions {
  distance: number;
  rng: Rng;
  dt?: number;
  maxTime?: number;
  course?: CourseSpecification;
  windKph?: number;
  windDirectionDeg?: number;
  /** Record a snapshot every N ticks (0 disables). */
  snapshotEveryTicks?: number;
  /** Record pace snapshots at 25/50/75% progress milestones. */
  recordPaceSnapshots?: boolean;
  /** Track split crossings at SPLIT_FRACTIONS. */
  trackSplits?: boolean;
  /** Called once per non-silent tick BEFORE runners step (commentary hooks). */
  onTick?: (sortedField: Runner[], simTime: number, silent: boolean) => void;
  /** Called after each tick — return false to stop (cancellation). */
  shouldContinue?: () => boolean;
}

export interface RaceSessionResult {
  result: { horseId: string; position: number; time: number }[];
  finishOrder: { horseId: string; position: number; time: number; gate: number }[];
  snapshots: RaceSnapshot[];
  paceSnapshots: PaceSnapshot[];
  factorLedgers: Record<string, RunnerFactorLedger>;
  splitCrossings: Map<string, number[]>;
  simTime: number;
  cancelled: boolean;
}

export class RaceSimulationSession {
  readonly runners: Runner[];
  readonly dt: number;
  readonly distance: number;
  readonly splitCrossings = new Map<string, number[]>();
  readonly snapshots: RaceSnapshot[] = [];
  readonly paceSnapshots: PaceSnapshot[] = [];
  readonly finishOrder: { horseId: string; position: number; time: number; gate: number }[] = [];

  simTime = 0;
  cancelled = false;

  private readonly opts: Required<
    Pick<RaceSessionOptions, "snapshotEveryTicks" | "recordPaceSnapshots" | "trackSplits">
  > &
    RaceSessionOptions;
  private readonly sortedField: Runner[];
  private readonly ranks: Int32Array;
  private readonly idToIndex = new Map<string, number>();
  private readonly laneDensity = new Array(12).fill(0);
  private readonly leadGroupVelocitiesBuffer: number[] = [];
  private readonly paceMilestones = [0.25, 0.5, 0.75];
  private nextMilestoneIdx = 0;
  private readonly splitMarkers: number[];
  private finishedCount = 0;
  private tickCount = 0;

  constructor(runners: Runner[], options: RaceSessionOptions) {
    this.runners = runners;
    this.opts = {
      snapshotEveryTicks: 0,
      recordPaceSnapshots: false,
      trackSplits: false,
      ...options,
    };
    this.dt = options.dt ?? DEFAULT_DT;
    this.distance = options.distance;
    this.splitMarkers = SPLIT_FRACTIONS.map((f) => f * this.distance);
    this.sortedField = [...runners];
    this.ranks = new Int32Array(runners.length);
    for (let i = 0; i < runners.length; i++) {
      this.idToIndex.set(runners[i].horseId, i);
      if (runners[i].finishTime !== null) this.finishedCount++;
    }
  }

  get finished(): boolean {
    return this.finishedCount >= this.runners.length;
  }

  /**
   * One fixed simulation step. Returns false when the race is over.
   * @param silent
   */
  step(silent = false): boolean {
    if (this.finished || this.simTime >= (this.opts.maxTime ?? 600)) return false;
    if (this.opts.shouldContinue && !this.opts.shouldContinue()) {
      this.cancelled = true;
      return false;
    }

    const { rng, course, windKph, windDirectionDeg } = this.opts;
    const runners = this.runners;
    const numRunners = runners.length;
    const t = this.simTime;
    const dt = this.dt;

    const pace: PaceContext = computePaceContext(
      runners,
      this.distance,
      this.laneDensity,
      this.leadGroupVelocitiesBuffer,
    );

    // Pace milestone snapshots (25/50/75% progress)
    if (
      this.opts.recordPaceSnapshots &&
      this.nextMilestoneIdx < this.paceMilestones.length &&
      pace.progress >= this.paceMilestones[this.nextMilestoneIdx]
    ) {
      const leader = runners.reduce<Runner | null>((best, r) => {
        if (r.finishTime !== null) return best;
        if (best === null || r.position > best.position) return r;
        return best;
      }, null);
      this.paceSnapshots.push({
        progress: this.paceMilestones[this.nextMilestoneIdx],
        paceRating: pace.paceRating,
        leaderVelocity: pace.leaderVelocity,
        leadGroupCount: pace.leadGroupCount,
        pacePressure: pace.pacePressure,
        leaderHorseId: leader?.horseId ?? null,
      });
      this.nextMilestoneIdx++;
    }

    // Sort field and compute alive ranks once per tick.
    for (let i = 0; i < numRunners; i++) this.sortedField[i] = runners[i];
    this.sortedField.sort((a, b) => b.position - a.position);
    let aliveRank = 0;
    for (const o of this.sortedField) {
      if (o.finishTime === null) {
        const idx = this.idToIndex.get(o.horseId);
        if (idx !== undefined) this.ranks[idx] = aliveRank;
        aliveRank++;
      }
    }

    if (!silent) this.opts.onTick?.(this.sortedField, t, silent);

    for (let i = 0; i < numRunners; i++) {
      const r = runners[i];
      if (r.finishTime !== null) continue;
      const posBefore = r.position;

      stepRunner(
        r,
        dt,
        t,
        this.distance,
        rng,
        this.sortedField,
        pace,
        course,
        this.ranks[i],
        aliveRank,
        windKph,
        windDirectionDeg,
        numRunners,
      );

      if (this.opts.trackSplits) this.recordSplit(r, posBefore, t + dt);
      if (r.finishTime !== null) {
        this.finishedCount++;
        this.recordFinish(r);
      }
    }

    this.simTime = t + dt;
    this.tickCount++;

    if (this.opts.snapshotEveryTicks > 0 && this.tickCount % this.opts.snapshotEveryTicks === 0) {
      this.snapshots.push(this.captureSnapshot());
    }

    return !this.finished;
  }

  /**
   * Run up to `n` fixed steps — identical semantics to n `step()` calls.
   * Stops early when the race finishes, hits max time, or is cancelled.
   * Returns the number of steps actually taken.
   * @param n
   * @param silent
   */
  stepMany(n: number, silent = false): number {
    const start = this.tickCount;
    for (let i = 0; i < n; i++) {
      if (!this.step(silent)) break;
    }
    return this.tickCount - start;
  }

  /** Run ticks until the field finishes, max time, or cancellation. */
  runToCompletion(): RaceSessionResult {
    while (this.step(true) && !this.cancelled) {
      // synchronous loop; cancellation is checked inside step()
    }
    return this.finalize();
  }

  /**
   * Silent fast-forward to a sim time (resume/replay join-in-progress).
   * @param targetTime
   */
  fastForwardTo(targetTime: number): void {
    while (this.simTime + this.dt * 0.5 < targetTime) {
      if (!this.step(true)) break;
    }
  }

  /** Finalize ledgers and build the result object. */
  finalize(): RaceSessionResult {
    // Ranked result is derived from every runner (including any that were
    // pre-finished before the session started) — same semantics as the
    // original runRaceToCompletion sort.
    const ranked = this.runners
      .map((r) => ({
        horseId: r.horseId,
        position: 0,
        time: r.finishTime ?? Infinity,
        gate: r.gate,
      }))
      .sort(compareFinishOrder);
    for (let i = 0; i < ranked.length; i++) ranked[i].position = i + 1;

    const factorLedgers: Record<string, RunnerFactorLedger> = {};
    for (const r of this.runners) {
      if (r.factorLedger) {
        const finalized = r.factorLedger.finalize();
        r.finalizedLedger = finalized;
        factorLedgers[r.horseId] = finalized;
      }
    }

    return {
      result: ranked.map((r) => ({ horseId: r.horseId, position: r.position, time: r.time })),
      finishOrder: ranked,
      snapshots: this.snapshots,
      paceSnapshots: this.paceSnapshots,
      factorLedgers,
      splitCrossings: this.splitCrossings,
      simTime: this.simTime,
      cancelled: this.cancelled,
    };
  }

  private recordSplit(r: Runner, posBefore: number, simTimeAfterStep: number): void {
    let crossings = this.splitCrossings.get(r.horseId);
    if (!crossings) {
      crossings = [];
      this.splitCrossings.set(r.horseId, crossings);
    }
    const nextMarkerIdx = crossings.length;
    if (nextMarkerIdx >= this.splitMarkers.length) return;
    const marker = this.splitMarkers[nextMarkerIdx];
    if (r.position >= marker && posBefore < marker) {
      const tBefore = simTimeAfterStep - this.dt;
      const frac = (marker - posBefore) / (r.position - posBefore);
      crossings.push(tBefore + frac * this.dt);
    }
  }

  private recordFinish(r: Runner): void {
    if (r.finishTime === null) return;
    this.finishOrder.push({ horseId: r.horseId, position: 0, time: r.finishTime, gate: r.gate });
    this.finishOrder.sort(compareFinishOrder);
    for (let i = 0; i < this.finishOrder.length; i++) this.finishOrder[i].position = i + 1;
  }

  private captureSnapshot(): RaceSnapshot {
    const horseSnapshots: HorseSnapshot[] = this.runners.map((r) => ({
      horseId: r.horseId,
      position: r.position,
      lane: r.lane,
      velocity: r.velocity,
      seekContribution: r.lastSeekContribution ?? 0,
      spurtContribution: r.lastSpurtContribution ?? 0,
    }));
    return { t: this.simTime, horses: horseSnapshots };
  }
}
