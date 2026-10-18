import { describe, it, expect } from "vitest";
import { BoundedPool, runSerial } from "@/platform/engine/workerPool";
import type { PartitionedJob } from "@/platform/engine/workerPool";

function sumJob(id: string, input: number[]): PartitionedJob<number[], number> {
  return { id, input, run: (nums) => nums.reduce((a, b) => a + b, 0) };
}

describe("BoundedPool", () => {
  it("respects the concurrency bound", async () => {
    let active = 0;
    let maxActive = 0;
    const pool = new BoundedPool({ concurrency: 2 });
    const jobs: PartitionedJob<number, number>[] = Array.from({ length: 8 }, (_, i) => ({
      id: `j${i}`,
      input: i,
      run: async (n) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 5));
        active--;
        return n * 2;
      },
    }));
    const out = await pool.runPartitioned(jobs);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(out).toEqual([0, 2, 4, 6, 8, 10, 12, 14]);
  });

  it("merges results in partition order, not completion order", async () => {
    const pool = new BoundedPool({ concurrency: 4 });
    // Later partitions resolve first — order in output must still be stable.
    const jobs: PartitionedJob<number, string>[] = Array.from({ length: 6 }, (_, i) => ({
      id: `j${i}`,
      input: i,
      run: async (n) => {
        await new Promise((r) => setTimeout(r, (6 - n) * 4));
        return `p${n}`;
      },
    }));
    expect(await pool.runPartitioned(jobs)).toEqual(["p0", "p1", "p2", "p3", "p4", "p5"]);
  });

  it("serial and pooled execution produce identical results", async () => {
    const partitions = BoundedPool.partition(
      Array.from({ length: 100 }, (_, i) => i + 1),
      4,
    );
    const jobs = partitions.map((p, i) => sumJob(`p${i}`, p));
    const serial = await runSerial(jobs);
    const pooled = await new BoundedPool({ concurrency: 4 }).runPartitioned(jobs);
    expect(pooled).toEqual(serial);
    expect(serial.reduce((a, b) => a + b, 0)).toBe(5050);
  });

  it("rejects the whole batch on partition failure — no partial merge", async () => {
    const pool = new BoundedPool({ concurrency: 2 });
    const merged: number[] = [];
    const jobs: PartitionedJob<number, number>[] = [0, 1, 2, 3].map((i) => ({
      id: `j${i}`,
      input: i,
      run: async (n) => {
        if (n === 1) throw new Error("boom");
        await new Promise((r) => setTimeout(r, 10));
        merged.push(n);
        return n;
      },
    }));
    await expect(pool.runPartitioned(jobs)).rejects.toThrow("boom");
  });

  it("deep-freeze purity: a job mutating its input is detected via strict-mode throw", async () => {
    const pool = new BoundedPool({ concurrency: 2 });
    const frozen = Object.freeze({ values: Object.freeze([1, 2, 3]) });
    const jobs: PartitionedJob<typeof frozen, number>[] = [
      { id: "pure", input: frozen, run: (inp) => inp.values.length },
      {
        id: "impure",
        input: frozen,
        run: (inp) => {
          // Assignment to a frozen object throws in strict mode (ESM).
          (inp as { values: number[] }).values = [];
          return 0;
        },
      },
    ];
    await expect(pool.runPartitioned(jobs)).rejects.toThrow();
    // Input object itself untouched.
    expect(frozen.values).toEqual([1, 2, 3]);
  });

  it("arbitrary interleavings still merge in partition order (fuzz)", async () => {
    const pool = new BoundedPool({ concurrency: 4 });
    for (let trial = 0; trial < 5; trial++) {
      const jobs: PartitionedJob<number, number>[] = Array.from({ length: 12 }, (_, i) => ({
        id: `j${i}`,
        input: i,
        run: async (n) => {
          // Random-ish deterministic delay derived from index+trial.
          const delay = ((n * 7 + trial * 3) % 9) + 1;
          await new Promise((r) => setTimeout(r, delay));
          return n * 10;
        },
      }));
      const out = await pool.runPartitioned(jobs);
      expect(out).toEqual(Array.from({ length: 12 }, (_, i) => i * 10));
    }
  });

  it("completed sibling partitions are discarded when one fails — no partial merge", async () => {
    const pool = new BoundedPool({ concurrency: 4 });
    const jobs: PartitionedJob<number, number>[] = [0, 1, 2, 3].map((i) => ({
      id: `j${i}`,
      input: i,
      run: async (n) => {
        if (n === 2) {
          await new Promise((r) => setTimeout(r, 1));
          throw new Error("crash");
        }
        await new Promise((r) => setTimeout(r, 20));
        return n;
      },
    }));
    await expect(pool.runPartitioned(jobs)).rejects.toThrow("crash");
  });

  it("crossover smoke: parallel-friendly async work beats serial wall time", async () => {
    const jobs: PartitionedJob<number, number>[] = Array.from({ length: 8 }, (_, i) => ({
      id: `j${i}`,
      input: i,
      run: async (n) => {
        await new Promise((r) => setTimeout(r, 10));
        return n;
      },
    }));
    const t0 = performance.now();
    await runSerial(jobs);
    const serialMs = performance.now() - t0;

    const t1 = performance.now();
    await new BoundedPool({ concurrency: 4 }).runPartitioned(jobs);
    const pooledMs = performance.now() - t1;

    // Serial ≈80ms, pooled ≈20ms — keep the bound loose enough to survive CI.
    expect(pooledMs).toBeLessThan(serialMs * 0.75);
  });

  it("partition() produces contiguous, stable, complete slices", () => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    const parts = BoundedPool.partition(items, 3);
    expect(parts.flat()).toEqual(items);
    expect(parts.map((p) => p.length)).toEqual([4, 3, 3]);
    // More parts than items → one item each, never empty work
    expect(BoundedPool.partition([1, 2], 8).map((p) => p.length)).toEqual([1, 1]);
    // Empty input
    expect(BoundedPool.partition([], 4)).toEqual([[]]);
  });
});
