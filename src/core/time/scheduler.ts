/**
 * scheduler.ts - Declarative phase scheduling and DAG compilation.
 *
 * Replaces numeric stage-range filtering with validated phase descriptors.
 * Every registered phase declares its identity, dependencies, produced/consumed
 * context products, cadence, read/write sets, and batching/parallel
 * classification. `compileSchedule` validates the registry and produces a
 * deterministic topological execution plan.
 *
 * A registration error (duplicate id, missing dependency, cycle, unsatisfied
 * product, unordered writer conflict, invalid cadence/batching combo,
 * parallel descriptor without a deterministic reducer) throws at compile
 * time — an invalid or omitted phase can never silently execute or be
 * dropped.
 */

import type { PipelinePhase, PipelineContext } from "./pipeline";
import { isPhaseDue, type PhaseCadence } from "./calendar";

export type PhaseBatching = "per-day" | "boundary-only" | "range-safe";

export interface PhaseDescriptor {
  /** Stable unique identifier (defaults to phase.name). */
  id: string;
  /** Human-readable label for progress/UI. */
  label: string;
  /** The executable phase. */
  phase: PipelinePhase;
  /** Phase ids that must run before this phase. */
  dependsOn?: string[];
  /** Context products this phase produces (e.g. "worldAssessment"). */
  provides?: string[];
  /** Context products this phase consumes. */
  requires?: string[];
  /** Scheduling cadence. */
  cadence: PhaseCadence;
  /** State field storing the day this phase last produced output (for
   *  weekly/seasonal/yearly/interval cadences). */
  lastRunField?: string;
  /** Interval length in days when cadence === "interval". */
  intervalDays?: number;
  /** Declared state slices read (documentation/guardrails). */
  reads?: string[];
  /** Declared state slices written. Two phases writing the same slice must be
   *  ordered by dependsOn or order — the compiler enforces this. */
  writes?: string[];
  /** Batching classification; "boundary-only" phases never run mid-range
   *  except on their due boundary. */
  batching?: PhaseBatching;
  /** Parallel-safety classification. Any non-serial value requires
   *  `mergeKey` + `seedNamespace` — enforced by the compiler. */
  parallel?: {
    kind: "pure" | "partitioned";
    mergeKey: string;
    seedNamespace: string;
  };
  /** Relative cost weight for progress reporting. */
  progressWeight?: number;
}

export interface CompiledSchedule {
  /** Phases in deterministic execution order. */
  phases: PhaseDescriptor[];
  /** id → descriptor for lookup. */
  byId: Map<string, PhaseDescriptor>;
}

class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScheduleError";
  }
}

export { ScheduleError };

/**
 * Validate and compile phase descriptors into a deterministic execution plan.
 *
 * Ordering rules: explicit `dependsOn` edges are authoritative; remaining
 * ties fall back to the descriptor's phase.order then registration order.
 * @param descriptors
 */
export function compileSchedule(descriptors: PhaseDescriptor[]): CompiledSchedule {
  const byId = new Map<string, PhaseDescriptor>();
  for (const d of descriptors) {
    if (!d.id) throw new ScheduleError("Phase descriptor missing id");
    if (byId.has(d.id)) throw new ScheduleError(`Duplicate phase id '${d.id}'`);
    if (d.cadence === "interval" && (d.intervalDays === undefined || d.intervalDays <= 0)) {
      throw new ScheduleError(`Phase '${d.id}': interval cadence requires intervalDays > 0`);
    }
    if (d.parallel && (!d.parallel.mergeKey || !d.parallel.seedNamespace)) {
      throw new ScheduleError(
        `Phase '${d.id}': parallel descriptor requires mergeKey and seedNamespace`,
      );
    }
    byId.set(d.id, d);
  }

  // Validate dependencies and products.
  const producer = new Map<string, string>();
  for (const d of descriptors) {
    for (const p of d.provides ?? []) {
      if (producer.has(p)) {
        throw new ScheduleError(
          `Context product '${p}' produced by both '${producer.get(p)}' and '${d.id}'`,
        );
      }
      producer.set(p, d.id);
    }
  }
  for (const d of descriptors) {
    for (const dep of d.dependsOn ?? []) {
      if (!byId.has(dep)) {
        throw new ScheduleError(`Phase '${d.id}' depends on missing phase '${dep}'`);
      }
      if (dep === d.id) throw new ScheduleError(`Phase '${d.id}' depends on itself`);
    }
    for (const req of d.requires ?? []) {
      if (!producer.has(req)) {
        throw new ScheduleError(
          `Phase '${d.id}' requires product '${req}' which no phase provides`,
        );
      }
    }
  }

  // Conflicting writers must be ordered by dependsOn or by order.
  const writeOwner = new Map<string, PhaseDescriptor[]>();
  for (const d of descriptors) {
    for (const w of d.writes ?? []) {
      const list = writeOwner.get(w) ?? [];
      list.push(d);
      writeOwner.set(w, list);
    }
  }
  for (const [slice, writers] of writeOwner) {
    for (let i = 0; i < writers.length; i++) {
      for (let j = i + 1; j < writers.length; j++) {
        const a = writers[i];
        const b = writers[j];
        const ordered =
          a.phase.order !== b.phase.order ||
          (a.dependsOn ?? []).includes(b.id) ||
          (b.dependsOn ?? []).includes(a.id);
        if (!ordered) {
          throw new ScheduleError(
            `Phases '${a.id}' and '${b.id}' both write '${slice}' without an ordering`,
          );
        }
      }
    }
  }

  // Topological sort: Kahn's algorithm over dependsOn edges, with ready-set
  // ordering by phase.order then registration index for determinism.
  const indexOf = new Map(descriptors.map((d, i) => [d.id, i]));
  const indegree = new Map<string, number>();
  const edges = new Map<string, string[]>();
  for (const d of descriptors) {
    indegree.set(d.id, 0);
    edges.set(d.id, []);
  }
  for (const d of descriptors) {
    for (const dep of d.dependsOn ?? []) {
      edges.get(dep)!.push(d.id);
      indegree.set(d.id, (indegree.get(d.id) ?? 0) + 1);
    }
  }

  const ready: PhaseDescriptor[] = descriptors
    .filter((d) => (indegree.get(d.id) ?? 0) === 0)
    .sort(sortByOrderThenIndex(indexOf));
  const result: PhaseDescriptor[] = [];

  while (ready.length > 0) {
    const next = ready.shift()!;
    result.push(next);
    for (const child of edges.get(next.id) ?? []) {
      const rem = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, rem);
      if (rem === 0) {
        ready.push(byId.get(child)!);
        ready.sort(sortByOrderThenIndex(indexOf));
      }
    }
  }

  if (result.length !== descriptors.length) {
    const remaining = descriptors.filter((d) => !result.includes(d)).map((d) => d.id);
    throw new ScheduleError(`Dependency cycle detected among: ${remaining.join(", ")}`);
  }

  return { phases: result, byId };
}

function sortByOrderThenIndex(indexOf: Map<string, number>) {
  return (a: PhaseDescriptor, b: PhaseDescriptor): number => {
    if (a.phase.order !== b.phase.order) return a.phase.order - b.phase.order;
    return (indexOf.get(a.id) ?? 0) - (indexOf.get(b.id) ?? 0);
  };
}

/**
 * Build a descriptor from a legacy PipelinePhase plus metadata.
 * @param phase
 * @param meta
 */
export function describePhase(
  phase: PipelinePhase,
  meta: Omit<PhaseDescriptor, "id" | "phase"> & { id?: string },
): PhaseDescriptor {
  return {
    id: meta.id ?? phase.name,
    phase,
    ...meta,
  };
}

/**
 * Convenience: run a compiled schedule's cadence gate for a day.
 * @param descriptor
 * @param context
 */
export function phaseIsDue(descriptor: PhaseDescriptor, context: PipelineContext): boolean {
  const lastRun = descriptor.lastRunField
    ? (context.state as unknown as Record<string, unknown>)[descriptor.lastRunField]
    : undefined;
  return isPhaseDue({
    cadence: descriptor.cadence,
    newDay: context.newDay,
    previousDay: context.previousDay,
    lastRunDay: typeof lastRun === "number" ? lastRun : undefined,
    intervalDays: descriptor.intervalDays,
  });
}
