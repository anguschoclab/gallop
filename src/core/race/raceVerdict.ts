import type { FactorKey, RunnerFactorLedger } from "./factorLedger";
import { FACTOR_META } from "./factorLedger";
import type { Runner } from "./engine/runnerTypes";
import type { TrackCondition, Weather } from "./types";

export interface VerdictFactor {
  key: FactorKey;
  label: string;
  impact: "positive" | "negative" | "neutral";
  magnitude: number;
  note: string;
  phaseHighlight?: string;
}

export interface RaceVerdict {
  headline: string;
  factors: VerdictFactor[];
  conditionsNote: string;
  fieldComparison?: string;
}

const IMPACT_THRESHOLD = 0.02;
const MAX_FACTORS = 4;
const MIN_FACTORS = 3;

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

function classifyImpact(raceAvg: number): "positive" | "negative" | "neutral" {
  const deviation = raceAvg - 1;
  if (deviation > IMPACT_THRESHOLD) return "positive";
  if (deviation < -IMPACT_THRESHOLD) return "negative";
  return "neutral";
}

function phaseFromProgress(progress: number): "early" | "mid" | "late" | null {
  if (progress <= 0.33) return "early";
  if (progress <= 0.67) return "mid";
  if (progress > 0.67) return "late";
  return null;
}

function phaseLabel(phase: "early" | "mid" | "late"): string {
  switch (phase) {
    case "early":
      return "in the opening stages";
    case "mid":
      return "mid-race";
    case "late":
      return "in the final third";
  }
}

function formatConditionsNote(trackCondition?: TrackCondition, weather?: Weather): string {
  if (!trackCondition && !weather) {
    return "Run under standard conditions.";
  }
  const parts: string[] = [];
  if (trackCondition) {
    parts.push(trackCondition);
  }
  if (weather) {
    const weatherDesc: Record<Weather, string> = {
      sunny: "under sunny skies",
      cloudy: "under cloudy skies",
      rainy: "under rain",
      sunset: "at sunset",
      night: "under floodlights",
    };
    parts.push(weatherDesc[weather]);
  }
  return `Run on ${parts.join(" ")}.`;
}

function generateFactorNote(
  key: FactorKey,
  raceAvg: number,
  impact: "positive" | "negative" | "neutral",
): string {
  const meta = FACTOR_META[key];
  const pct = Math.round((raceAvg - 1) * 100);
  const absPct = Math.abs(pct);

  switch (key) {
    case "stamina":
      if (impact === "negative") {
        return `Stamina faded to ${Math.round(raceAvg * 100)}% of baseline — the distance stretched this horse.`;
      }
      return `Stamina held firm at ${Math.round(raceAvg * 100)}% — energy reserves lasted the trip.`;
    case "style":
      if (impact === "positive") {
        return `Running style suited the pace shape (+${absPct}%).`;
      }
      return `Running style clashed with the pace shape (${pct}%).`;
    case "draft":
      if (impact === "positive") {
        return `Saved energy drafting behind the lead group (+${absPct}%).`;
      }
      return `No drafting benefit available (${pct}%).`;
    case "cover":
      if (impact === "positive") {
        return `Benefited from traffic cover, conserving energy (+${absPct}%).`;
      }
      return `Exposed without cover (${pct}%).`;
    case "turnSpeed":
      if (impact === "negative") {
        return `Lost ${absPct}% through corners; lower cornering aptitude than rivals.`;
      }
      return `Navigated corners efficiently (${pct >= 0 ? "+" : ""}${pct}%).`;
    case "gradientSpeed":
      if (impact === "negative") {
        return `Gradient cost ${absPct}% on speed — uphill sections took their toll.`;
      }
      return `Handled elevation changes well (${pct >= 0 ? "+" : ""}${pct}%).`;
    case "gradientStamina":
      if (impact === "negative") {
        return `Climbing drained extra stamina (${pct}%).`;
      }
      return `Gradient stamina cost was minimal (${pct >= 0 ? "+" : ""}${pct}%).`;
    case "traitSurface":
      if (impact === "positive") {
        return `Jockey surface expertise paid off (+${absPct}%).`;
      }
      return `Surface specialist bonus was absent (${pct}%).`;
    case "seek":
      if (impact === "negative") {
        return `Struggled to establish early position (${pct}%).`;
      }
      return `Secured a good early slot (${pct >= 0 ? "+" : ""}${pct}%).`;
    case "spurt":
      if (impact === "positive") {
        return `Devastating closing kick (+${absPct}%) in the final furlongs.`;
      }
      return ` lacked a finishing spurt (${pct}%).`;
    case "wind":
      if (impact === "positive") {
        return `Benefited from favourable wind conditions (+${absPct}%).`;
      }
      return `Hampered by headwind or crosswind (${pct}%).`;
    case "noise":
      if (impact !== "neutral") {
        return `Performance varied by ${absPct}% due to random factors.`;
      }
      return `Consistent performance with minimal variance.`;
    default:
      return `${meta.label}: ${pct}%`;
  }
}

function generateHeadline(
  position: number,
  fieldSize: number,
  topFactor: { key: FactorKey; impact: "positive" | "negative" | "neutral"; raceAvg: number },
): string {
  const isWinner = position === 1;
  const isPlaced = position <= 3;
  const isTail = position >= fieldSize - 1;
  const { key, impact } = topFactor;

  if (isWinner) {
    if (key === "spurt" && impact === "positive") {
      return "Won with a devastating closing kick.";
    }
    if (key === "stamina" && impact !== "negative") {
      return "Classy front-running display; stamina held to the line.";
    }
    if (key === "style" && impact === "positive") {
      return "Won with a perfectly judged ride — pace shape suited to a tee.";
    }
    if (key === "draft" && impact === "positive") {
      return "Drafted masterfully, saved energy for the winning move.";
    }
    return "Scored with a professional, well-managed performance.";
  }

  if (isPlaced) {
    if (key === "stamina" && impact === "negative") {
      return "Faded late — stamina couldn't sustain the distance.";
    }
    if (key === "spurt" && impact === "positive") {
      return "Closed strongly for a placing — finishing kick was the highlight.";
    }
    if (key === "wind" && impact === "negative") {
      return "Hampered by conditions but fought on for a placing.";
    }
    return "Ran a solid race in the placings.";
  }

  if (isTail) {
    if (key === "wind" && impact === "negative") {
      return "Never involved — struggled against the conditions.";
    }
    if (key === "stamina" && impact === "negative") {
      return "Faded badly — the distance proved too far.";
    }
    return "Never competitive on the day.";
  }

  // Mid-pack
  if (key === "draft" && impact === "positive") {
    return "Ran evenly with good cover, lacked the class to challenge.";
  }
  if (key === "stamina" && impact === "negative") {
    return "Faded through the middle distances — stamina a concern.";
  }
  if (key === "spurt" && impact === "positive") {
    return "Finished respectably with a late spurt, but too far back to threaten.";
  }
  return "Mid-pack finish — kept on without threatening the leaders.";
}

function generateFieldComparison(
  runner: Runner,
  ledger: RunnerFactorLedger,
  fieldLedgers: Map<string, RunnerFactorLedger>,
): string | undefined {
  const runnerId = runner.horseId;
  const comparisons: string[] = [];

  // Find the factor where runner deviates most from field average
  let maxFieldDelta = 0;
  let maxFieldKey: FactorKey | null = null;
  let maxFieldRunnerAvg = 0;
  let maxFieldAvg = 0;

  for (const key of ALL_FACTOR_KEYS) {
    const runnerAvg = ledger[key].raceAvg;
    let fieldSum = 0;
    let fieldCount = 0;
    for (const [hid, fl] of fieldLedgers) {
      if (hid === runnerId) continue;
      fieldSum += fl[key].raceAvg;
      fieldCount++;
    }
    if (fieldCount === 0) continue;
    const fieldAvg = fieldSum / fieldCount;
    const delta = Math.abs(runnerAvg - fieldAvg);
    if (delta > maxFieldDelta) {
      maxFieldDelta = delta;
      maxFieldKey = key;
      maxFieldRunnerAvg = runnerAvg;
      maxFieldAvg = fieldAvg;
    }
  }

  if (maxFieldKey && maxFieldDelta > 0.005) {
    const meta = FACTOR_META[maxFieldKey];
    const runnerPct = Math.round((maxFieldRunnerAvg - 1) * 100);
    const fieldPct = Math.round((maxFieldAvg - 1) * 100);
    const diff = runnerPct - fieldPct;
    if (diff < 0) {
      comparisons.push(
        `Lost ${Math.abs(diff)}% more speed to ${meta.label.toLowerCase()} than the field average.`,
      );
    } else {
      comparisons.push(
        `Gained ${diff}% more from ${meta.label.toLowerCase()} than the field average.`,
      );
    }
  }

  return comparisons.length > 0 ? comparisons[0] : undefined;
}

export function generateRaceVerdict(
  runner: Runner,
  position: number,
  ordered: Runner[],
  ledger: RunnerFactorLedger,
  fieldLedgers?: Map<string, RunnerFactorLedger>,
): RaceVerdict {
  const fieldSize = ordered.length;
  const conditionsNote = formatConditionsNote(runner.trackCondition, runner.weather);

  // Rank factors by magnitude of deviation from 1.0
  const ranked = ALL_FACTOR_KEYS.map((key) => {
    const entry = ledger[key];
    const magnitude = Math.abs(entry.raceAvg - 1);
    return { key, magnitude, entry };
  }).sort((a, b) => b.magnitude - a.magnitude);

  // Take top factors (those with meaningful deviation first, then fill to min)
  const significant = ranked.filter((r) => r.magnitude > IMPACT_THRESHOLD);
  const selected =
    significant.length >= MIN_FACTORS
      ? significant.slice(0, MAX_FACTORS)
      : ranked.slice(0, MAX_FACTORS);

  const factors: VerdictFactor[] = selected.map(({ key, entry }) => {
    const impact = classifyImpact(entry.raceAvg);
    const phase = phaseFromProgress(entry.peakProgress);
    const meta = FACTOR_META[key];

    return {
      key,
      label: meta.label,
      impact,
      magnitude: entry.peakDeviation,
      note: generateFactorNote(key, entry.raceAvg, impact),
      phaseHighlight:
        phase && entry.peakDeviation > IMPACT_THRESHOLD
          ? `${meta.label.toLowerCase()} ${phaseLabel(phase)}`
          : undefined,
    };
  });

  // Generate headline from top factor
  const topKey = ranked[0]?.key ?? "stamina";
  const topEntry = ledger[topKey];
  const topImpact = classifyImpact(topEntry.raceAvg);
  const headline = generateHeadline(position, fieldSize, {
    key: topKey,
    impact: topImpact,
    raceAvg: topEntry.raceAvg,
  });

  // Field comparison
  const fieldComparison = fieldLedgers
    ? generateFieldComparison(runner, ledger, fieldLedgers)
    : undefined;

  return {
    headline,
    factors,
    conditionsNote,
    fieldComparison,
  };
}
