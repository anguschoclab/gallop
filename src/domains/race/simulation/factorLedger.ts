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
  draft: { label: "Drafting", description: "Energy conservation from drafting (speed-neutral)" },
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
    const phase = classifyPhase(progress);
    const accumulators = this.accumulators;

    this._recordOne(accumulators.stamina, phase, progress, factors.stamina);
    this._recordOne(accumulators.style, phase, progress, factors.style);
    this._recordOne(accumulators.draft, phase, progress, factors.draft);
    this._recordOne(accumulators.cover, phase, progress, factors.cover);
    this._recordOne(accumulators.turnSpeed, phase, progress, factors.turnSpeed);
    this._recordOne(accumulators.gradientSpeed, phase, progress, factors.gradientSpeed);
    this._recordOne(accumulators.gradientStamina, phase, progress, factors.gradientStamina);
    this._recordOne(accumulators.traitSurface, phase, progress, factors.traitSurface);
    this._recordOne(accumulators.seek, phase, progress, factors.seek);
    this._recordOne(accumulators.spurt, phase, progress, factors.spurt);
    this._recordOne(accumulators.wind, phase, progress, factors.wind);
    this._recordOne(accumulators.noise, phase, progress, factors.noise);
  }

  private _recordOne(
    acc: FactorAccumulator,
    phase: PhaseKey,
    progress: number,
    val: number | undefined,
  ): void {
    if (val === undefined) return;

    const p = acc.phases[phase];
    p.sum += val;
    p.count += 1;
    if (val < p.min) p.min = val;
    if (val > p.max) p.max = val;

    acc.totalSum += val;
    acc.totalCount += 1;

    const dev = val > 1 ? val - 1 : 1 - val;
    if (dev > acc.peakDeviation) {
      acc.peakDeviation = dev;
      acc.peakValue = val;
      acc.peakProgress = progress;
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
