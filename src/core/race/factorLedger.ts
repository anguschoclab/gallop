export type FactorKey =
  | "stamina"
  | "style"
  | "draft"
  | "cover"
  | "turnSpeed"
  | "gradientSpeed"
  | "gradientStamina"
  | "traitSurface"
  | "seek"
  | "spurt"
  | "wind"
  | "noise";

export type PhaseKey = "early" | "mid" | "late";

export interface FactorPhaseSummary {
  avg: number;
  min: number;
  max: number;
}

export interface FactorEntry {
  phases: Record<PhaseKey, FactorPhaseSummary>;
  peakProgress: number;
  peakValue: number;
  peakDeviation: number;
  raceAvg: number;
}

export type RunnerFactorLedger = Record<FactorKey, FactorEntry>;

export const FACTOR_META: Record<FactorKey, { label: string; description: string }> = {
  stamina: { label: "Stamina Fade", description: "Energy depletion over the race distance" },
  style: { label: "Running Style", description: "Pace shape suitability for this horse" },
  draft: { label: "Drafting", description: "Aerodynamic benefit from horses ahead" },
  cover: { label: "Cover", description: "Energy conservation from traffic cover" },
  turnSpeed: { label: "Cornering", description: "Speed loss through turns" },
  gradientSpeed: { label: "Gradient (Speed)", description: "Uphill/downhill speed effect" },
  gradientStamina: { label: "Gradient (Stamina)", description: "Energy cost of climbing" },
  traitSurface: { label: "Surface Suitability", description: "Jockey surface specialist bonus" },
  seek: { label: "Position Seeking", description: "Early-race slot establishment" },
  spurt: { label: "Closing Kick", description: "Final-furlong acceleration buildup" },
  wind: { label: "Wind Effect", description: "Headwind/tailwind/crosswind impact" },
  noise: { label: "Variance", description: "Random performance fluctuation" },
};

const ALL_FACTOR_KEYS: FactorKey[] = [
  "stamina",
  "style",
  "draft",
  "cover",
  "turnSpeed",
  "gradientSpeed",
  "gradientStamina",
  "traitSurface",
  "seek",
  "spurt",
  "wind",
  "noise",
];

const DEFAULT_PHASE: FactorPhaseSummary = { avg: 1, min: 1, max: 1 };

function classifyPhase(progress: number): PhaseKey {
  if (progress <= 0.33) return "early";
  if (progress <= 0.67) return "mid";
  return "late";
}

interface PhaseAccumulator {
  sum: number;
  min: number;
  max: number;
  count: number;
}

function makePhaseAccumulator(): PhaseAccumulator {
  return { sum: 0, min: Infinity, max: -Infinity, count: 0 };
}

interface FactorAccumulator {
  phases: Record<PhaseKey, PhaseAccumulator>;
  totalSum: number;
  totalCount: number;
  peakProgress: number;
  peakValue: number;
  peakDeviation: number;
}

function makeFactorAccumulator(): FactorAccumulator {
  return {
    phases: {
      early: makePhaseAccumulator(),
      mid: makePhaseAccumulator(),
      late: makePhaseAccumulator(),
    },
    totalSum: 0,
    totalCount: 0,
    peakProgress: 0,
    peakValue: 1,
    peakDeviation: 0,
  };
}

export class FactorLedgerCollector {
  private accumulators: Record<FactorKey, FactorAccumulator>;

  constructor() {
    this.accumulators = {} as Record<FactorKey, FactorAccumulator>;
    for (const key of ALL_FACTOR_KEYS) {
      this.accumulators[key] = makeFactorAccumulator();
    }
  }

  recordTick(progress: number, factors: Record<FactorKey, number>): void {
    for (const key of ALL_FACTOR_KEYS) {
      const value = factors[key];
      if (value === undefined) continue;

      const acc = this.accumulators[key];
      const phase = classifyPhase(progress);
      const phaseAcc = acc.phases[phase];

      phaseAcc.sum += value;
      phaseAcc.min = Math.min(phaseAcc.min, value);
      phaseAcc.max = Math.max(phaseAcc.max, value);
      phaseAcc.count += 1;

      acc.totalSum += value;
      acc.totalCount += 1;

      const deviation = Math.abs(value - 1);
      if (deviation > acc.peakDeviation) {
        acc.peakDeviation = deviation;
        acc.peakValue = value;
        acc.peakProgress = progress;
      }
    }
  }

  finalize(): RunnerFactorLedger {
    const ledger = {} as RunnerFactorLedger;
    for (const key of ALL_FACTOR_KEYS) {
      const acc = this.accumulators[key];
      ledger[key] = {
        phases: {
          early: this.finalizePhase(acc.phases.early),
          mid: this.finalizePhase(acc.phases.mid),
          late: this.finalizePhase(acc.phases.late),
        },
        peakProgress: acc.peakProgress,
        peakValue: acc.peakValue,
        peakDeviation: acc.peakDeviation,
        raceAvg: acc.totalCount > 0 ? acc.totalSum / acc.totalCount : 1,
      };
    }
    return ledger;
  }

  private finalizePhase(acc: PhaseAccumulator): FactorPhaseSummary {
    if (acc.count === 0) return { ...DEFAULT_PHASE };
    return {
      avg: acc.sum / acc.count,
      min: acc.min,
      max: acc.max,
    };
  }
}
