/**
 * telemetry.ts - Opt-in timing/metrics sink for the simulation executor.
 *
 * When disabled (the default), recording is a no-op with no allocation —
 * instrumentation must never perturb simulation behavior or RNG streams.
 * When enabled, spans and counters are aggregated into a report.
 */

export interface TelemetrySample {
  label: string;
  ms: number;
  count: number;
}

export interface TelemetryReport {
  enabled: boolean;
  totalMs: number;
  spans: TelemetrySample[];
  counters: Record<string, number>;
}

export interface TelemetrySink {
  readonly enabled: boolean;
  /** Measure a synchronous span under `label`. */
  span<T>(label: string, fn: () => T): T;
  /** Record a counter increment. */
  count(label: string, amount?: number): void;
  /** Produce the aggregated report. */
  report(): TelemetryReport;
  /** Reset all collected samples. */
  reset(): void;
}

export function createTelemetry(enabled: boolean = false): TelemetrySink {
  if (!enabled) {
    return {
      enabled: false,
      span: (_label, fn) => fn(),
      count: () => {},
      report: () => ({ enabled: false, totalMs: 0, spans: [], counters: {} }),
      reset: () => {},
    };
  }

  const spans = new Map<string, { ms: number; count: number }>();
  const counters: Record<string, number> = {};
  let totalMs = 0;

  return {
    enabled: true,
    span<T>(label: string, fn: () => T): T {
      const start = performance.now();
      try {
        return fn();
      } finally {
        const elapsed = performance.now() - start;
        totalMs += elapsed;
        const entry = spans.get(label) ?? { ms: 0, count: 0 };
        entry.ms += elapsed;
        entry.count += 1;
        spans.set(label, entry);
      }
    },
    count(label: string, amount: number = 1): void {
      counters[label] = (counters[label] ?? 0) + amount;
    },
    report(): TelemetryReport {
      return {
        enabled: true,
        totalMs,
        spans: [...spans.entries()]
          .map(([label, v]) => ({ label, ms: v.ms, count: v.count }))
          .sort((a, b) => b.ms - a.ms),
        counters: { ...counters },
      };
    },
    reset(): void {
      spans.clear();
      for (const k of Object.keys(counters)) delete counters[k];
      totalMs = 0;
    },
  };
}
