/**
 * workerPool.ts - Bounded pool for proven-pure parallel jobs.
 *
 * Thread-safety model (per the redesign): pool workers own immutable inputs
 * and ephemeral buffers only; the main thread remains the single writer.
 * Results are merged in stable partition order — never completion order —
 * so serial and pooled execution produce identical output.
 *
 * A job is only eligible when its descriptor declares `parallel` with a
 * `mergeKey` reducer and `seedNamespace` (enforced by the scheduler), its
 * read/write audit proved purity, and benchmarks showed >=15% improvement.
 * Until then, callers should use `runSerial`, which shares the same merge
 * semantics with zero pool overhead.
 *
 * Fault behavior: a crashed worker job fails that partition; the pool never
 * merges partial results — callers receive a rejected promise and may fall
 * back to `runSerial` on the same inputs.
 */

export interface PoolOptions {
  /** Max concurrent tasks. Defaults to a conservative hardware-based cap. */
  concurrency?: number;
}

export interface PartitionedJob<Input, Output> {
  /** Stable id for telemetry/retry-keying. */
  id: string;
  input: Input;
  run: (input: Input) => Output | Promise<Output>;
}

const DEFAULT_MAX_CONCURRENCY = 4;

function hardwareCap(): number {
  const hc =
    typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 4;
  // Conservative cap: leave the main thread and one core free.
  return Math.max(1, Math.min(DEFAULT_MAX_CONCURRENCY, hc - 1));
}

export class BoundedPool {
  readonly concurrency: number;

  constructor(options: PoolOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? hardwareCap());
  }

  /**
   * Run partitioned pure jobs with bounded concurrency. Results are returned
   * in partition order regardless of completion order — deterministic merge.
   * If any partition fails, the whole batch rejects and nothing is merged.
   * @param jobs
   */
  async runPartitioned<Input, Output>(jobs: PartitionedJob<Input, Output>[]): Promise<Output[]> {
    const results: Output[] = new Array(jobs.length);
    let next = 0;
    let failure: unknown = null;

    const worker = async (): Promise<void> => {
      while (failure === null) {
        const i = next++;
        if (i >= jobs.length) return;
        try {
          results[i] = await jobs[i].run(jobs[i].input);
        } catch (err) {
          // Record the first failure; in-flight partitions finish but their
          // results are discarded — no partial merge is ever visible.
          failure = err;
          return;
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(this.concurrency, jobs.length) }, () => worker()),
    );

    if (failure !== null) throw failure;
    return results;
  }

  /**
   * Stable ID-range partitioning helper: contiguous slices, deterministic.
   * @param items
   * @param parts
   */
  static partition<T>(items: T[], parts: number): T[][] {
    const n = Math.max(1, Math.min(parts, items.length));
    const out: T[][] = [];
    const base = Math.floor(items.length / n);
    const extra = items.length % n;
    let start = 0;
    for (let i = 0; i < n; i++) {
      const size = base + (i < extra ? 1 : 0);
      out.push(items.slice(start, start + size));
      start += size;
    }
    return out;
  }
}

/**
 * Serial fallback with identical merge semantics. Use when a job has not yet
 * passed the purity/determinism/benchmark gates for pool execution.
 * @param jobs
 */
export async function runSerial<Input, Output>(
  jobs: PartitionedJob<Input, Output>[],
): Promise<Output[]> {
  const results: Output[] = new Array(jobs.length);
  for (let i = 0; i < jobs.length; i++) {
    results[i] = await jobs[i].run(jobs[i].input);
  }
  return results;
}
