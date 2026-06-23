/**
 * jockeyReport.ts — Post-race jockey evaluation system.
 *
 * Produces a detailed scorecard (10 facets) for an owned runner based on the
 * jockey's stats, the horse's profile, the race shape, and the sectional
 * splits.  Each facet returns a 0–100 score, a letter grade, and a short
 * narrative note suitable for display.
 */

import type { Runner } from "@/core/race/engine/runnerBuilder";
import type { SectionalSplit } from "@/core/race/types";

export type JockeyReportGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export type JockeyReportFacetId =
  | "gate_break"
  | "pace_setting"
  | "positioning"
  | "tactical_execution"
  | "closing_kick"
  | "energy_management"
  | "traffic_handling"
  | "course_knowledge"
  | "horse_affinity"
  | "overall_ride";

export interface JockeyReportFacet {
  id: JockeyReportFacetId;
  label: string;
  description: string;
  score: number; // 0-100
  grade: JockeyReportGrade;
  note: string;
}

export interface JockeyReport {
  horseId: string;
  horseName: string;
  jockeyName: string;
  jockeyId?: string;
  finishPosition: number;
  fieldSize: number;
  averageScore: number;
  averageGrade: JockeyReportGrade;
  facets: JockeyReportFacet[];
}

// ------------------------------ helpers ------------------------------

function clamp(v: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function gradeFromScore(score: number): JockeyReportGrade {
  if (score >= 92) return "A+";
  if (score >= 82) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function ranksByHorse(splits: SectionalSplit[], horseId: string): number[] {
  // Pre-calculate rank efficiently with a single O(N*M) pass using a standard for loop
  // instead of chaining O(N) .map(), O(M) .find(), and O(N) .filter().
  const ranks: number[] = [];
  for (let i = 0; i < splits.length; i++) {
    const entries = splits[i].entries;
    for (let j = 0; j < entries.length; j++) {
      if (entries[j].horseId === horseId) {
        ranks.push(entries[j].rank);
        break; // Found the horse in this split, move to the next split
      }
    }
  }
  return ranks;
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  return Math.sqrt(avg(xs.map((x) => (x - m) ** 2)));
}

// ------------------------------ facets ------------------------------

function evalGateBreak(runner: Runner, ranks: number[], fieldSize: number): JockeyReportFacet {
  const gate = runner.jockey?.stats.gateSkill ?? 50;
  const barrier = runner.barrier ?? 1;
  const firstRank = ranks[0];
  const expected = (barrier / Math.max(1, fieldSize)) * fieldSize; // rough barrier expectation
  let score: number;
  let note: string;
  if (firstRank === undefined) {
    score = clamp(gate);
    note = "No sectional data — graded on gate skill alone.";
  } else {
    const delta = expected - firstRank; // positive = better than barrier
    const swing = clamp(50 + delta * 6 + (gate - 50) * 0.6, 0, 100);
    score = swing;
    if (delta >= 2) note = `Sharp break from gate ${barrier} into ${firstRank}th early.`;
    else if (delta <= -2) note = `Slow away — lost ground from gate ${barrier}.`;
    else note = `Clean break from gate ${barrier}, settled ${firstRank}th early.`;
  }
  return {
    id: "gate_break",
    label: "Gate Break",
    description: "How well the start was handled given the barrier draw.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalPaceSetting(runner: Runner, ranks: number[]): JockeyReportFacet {
  const pacing = runner.jockey?.stats.pacing ?? 50;
  const earlyRanks = ranks.slice(0, Math.max(1, Math.ceil(ranks.length / 2)));
  const earlyAvg = avg(earlyRanks);
  const style = runner.runningStyle;
  const ideal = style === "E" ? 1.5 : style === "EP" ? 3 : style === "P" ? 5 : 7;
  const mismatch = Math.abs(earlyAvg - ideal);
  const score = clamp(80 - mismatch * 7 + (pacing - 50) * 0.4);
  let note: string;
  if (mismatch < 1.2) note = `Pace judgement matched ${style}-style perfectly.`;
  else if (mismatch < 2.5) note = `Slight mismatch with intended ${style} tactics.`;
  else note = `Out of position for a ${style} runner (avg early ${earlyAvg.toFixed(1)}).`;
  return {
    id: "pace_setting",
    label: "Pace Judgement",
    description: "Did the early fractions suit the horse's running style?",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalPositioning(runner: Runner, ranks: number[]): JockeyReportFacet {
  const positioning = runner.jockey?.stats.positioning ?? 50;
  if (ranks.length < 2) {
    return {
      id: "positioning",
      label: "Positioning",
      description: "Consistency of position through the body of the race.",
      score: clamp(positioning),
      grade: gradeFromScore(clamp(positioning)),
      note: "Insufficient sectional data.",
    };
  }
  const sd = stddev(ranks);
  // Lower volatility = better positioning, unless the trend is steady improvement
  const improvement = ranks[0] - ranks[ranks.length - 1];
  const score = clamp(70 - sd * 7 + improvement * 4 + (positioning - 50) * 0.3);
  let note: string;
  if (sd < 1) note = "Locked into a perfect spot — never shuffled back.";
  else if (improvement >= 3)
    note = `Steady climb from ${ranks[0]}th to ${ranks[ranks.length - 1]}th.`;
  else if (sd > 3) note = "Shuffled around the field — couldn't find a rhythm.";
  else note = "Held a workable spot for most of the trip.";
  return {
    id: "positioning",
    label: "Positioning",
    description: "Consistency of position through the body of the race.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalTacticalExecution(
  runner: Runner,
  ranks: number[],
  finishRank: number,
): JockeyReportFacet {
  const style = runner.runningStyle;
  const pacing = runner.jockey?.stats.pacing ?? 50;
  const positioning = runner.jockey?.stats.positioning ?? 50;
  const earlyRank = ranks[0] ?? finishRank;
  const lateRank = ranks[ranks.length - 1] ?? finishRank;
  let alignment: number;
  if (style === "E") alignment = earlyRank <= 2 ? 1 : 0.2;
  else if (style === "EP") alignment = earlyRank <= 4 ? 0.85 : 0.4;
  else if (style === "P") alignment = earlyRank >= 3 && lateRank <= earlyRank ? 0.9 : 0.5;
  else alignment = earlyRank >= 4 && lateRank < earlyRank ? 1 : 0.4;
  const skill = (pacing + positioning) / 2;
  const score = clamp(40 + alignment * 45 + (skill - 50) * 0.3);
  const note =
    alignment >= 0.85
      ? `Textbook ${style} ride — plan executed cleanly.`
      : alignment >= 0.5
        ? `Adequate execution of the ${style} plan.`
        : `Failed to execute the ${style} plan; tactics drifted.`;
  return {
    id: "tactical_execution",
    label: "Tactical Execution",
    description: "Alignment between the chosen running style and the actual trip.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalClosingKick(runner: Runner, ranks: number[], finishRank: number): JockeyReportFacet {
  const vigor = runner.jockey?.stats.vigor ?? 50;
  const lateMarker = ranks[ranks.length - 2] ?? ranks[ranks.length - 1] ?? finishRank;
  const gained = lateMarker - finishRank; // positive = picked up spots in the lane
  const score = clamp(55 + gained * 9 + (vigor - 50) * 0.5);
  let note: string;
  if (gained >= 3) note = `Strong drive — picked up ${gained} spots in the lane.`;
  else if (gained > 0) note = `Found another gear late, gained ${gained} place(s).`;
  else if (gained === 0) note = "Held position through the wire without surrendering.";
  else note = `Faded ${Math.abs(gained)} place(s) in the final furlong.`;
  return {
    id: "closing_kick",
    label: "Closing Kick",
    description: "Effort and improvement through the final stretch.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalEnergyManagement(
  runner: Runner,
  ranks: number[],
  finishRank: number,
): JockeyReportFacet {
  const vigor = runner.jockey?.stats.vigor ?? 50;
  const stamina = runner.horse?.stats?.stamina ?? 50;
  const earlyRank = ranks[0] ?? finishRank;
  const fade = finishRank - earlyRank; // positive = faded
  let score: number;
  let note: string;
  if (fade <= -1) {
    score = clamp(78 + Math.abs(fade) * 4 + (vigor - 50) * 0.3);
    note = "Reserves were saved for when it counted.";
  } else if (fade <= 1) {
    score = clamp(70 + (vigor - 50) * 0.4);
    note = "Energy distribution stayed even gate to wire.";
  } else if (fade <= 3) {
    score = clamp(55 - fade * 3 + (stamina - 50) * 0.3);
    note = "Mild late fade — could have rationed effort better.";
  } else {
    score = clamp(35 - fade * 2);
    note = `Burned out late, dropping ${fade} place(s) after the early run.`;
  }
  return {
    id: "energy_management",
    label: "Energy Management",
    description: "How fuel was rationed across the trip.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalTrafficHandling(runner: Runner, ranks: number[]): JockeyReportFacet {
  const positioning = runner.jockey?.stats.positioning ?? 50;
  const temperament = runner.jockey?.stats.temperament ?? 50;
  // approximate traffic by counting how often the rank moved by 2+ between markers
  let jolts = 0;
  for (let i = 1; i < ranks.length; i++) {
    if (Math.abs(ranks[i] - ranks[i - 1]) >= 2) jolts++;
  }
  const skill = (positioning + temperament) / 2;
  const score = clamp(80 - jolts * 12 + (skill - 50) * 0.3);
  const note =
    jolts === 0
      ? "Clean trip — never caught in traffic."
      : jolts === 1
        ? "One bump shuffled the position briefly."
        : `Choppy trip with ${jolts} traffic incidents to navigate.`;
  return {
    id: "traffic_handling",
    label: "Traffic Handling",
    description: "Ability to keep clear running through the field.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalCourseKnowledge(runner: Runner): JockeyReportFacet {
  const mult = runner.courseFamiliarityMultiplier ?? 1;
  // 1.0 baseline; >1 = familiar bonus; cap interpretation around 1.06
  const norm = clamp((mult - 0.95) / 0.12); // -> 0..1 roughly
  const score = clamp(45 + norm * 55);
  let note: string;
  if (mult >= 1.04) note = "Knows every contour of this course intimately.";
  else if (mult >= 1.015) note = "Has prior reps over this layout — useful edge.";
  else if (mult >= 1.0) note = "Standard familiarity with the course.";
  else note = "First-time / unfamiliar trip over this surface.";
  return {
    id: "course_knowledge",
    label: "Course Knowledge",
    description: "Familiarity bonus from prior outings over this layout.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalHorseAffinity(runner: Runner): JockeyReportFacet {
  const affinity = runner.affinityBonus ?? 0; // 0..~0.15
  const norm = clamp(affinity / 0.15);
  const score = clamp(40 + norm * 60);
  let note: string;
  if (affinity >= 0.1) note = "Rider and horse move as one — 'The Hand' is real.";
  else if (affinity >= 0.05) note = "Building chemistry from repeat partnerships.";
  else if (affinity > 0) note = "Early signs of a working partnership.";
  else note = "First-time pairing — no chemistry bonus yet.";
  return {
    id: "horse_affinity",
    label: "Horse Affinity",
    description: "Rider–horse chemistry built from prior rides together.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

function evalOverall(
  runner: Runner,
  finishRank: number,
  fieldSize: number,
  facetAvg: number,
): JockeyReportFacet {
  const finishScore = clamp(100 - ((finishRank - 1) / Math.max(1, fieldSize - 1)) * 75);
  const score = clamp(facetAvg * 0.6 + finishScore * 0.4);
  let note: string;
  if (finishRank === 1) note = "Wire-to-wire decision-making delivered the win.";
  else if (finishRank <= 3) note = `Hit the board — ${finishRank} of ${fieldSize}.`;
  else if (finishRank <= Math.ceil(fieldSize / 2))
    note = "Competitive ride, just outside the money.";
  else note = "Off the board today; review the facets for what to fix.";
  return {
    id: "overall_ride",
    label: "Overall Ride",
    description: "Composite verdict weighing all facets with the result.",
    score,
    grade: gradeFromScore(score),
    note,
  };
}

// ------------------------------ entry point ------------------------------

export function generateJockeyReport(
  runner: Runner,
  ordered: Runner[],
  sectionalSplits: SectionalSplit[] | undefined,
): JockeyReport {
  const fieldSize = ordered.length;
  const finishPosition = Math.max(1, ordered.findIndex((r) => r.horseId === runner.horseId) + 1);
  const ranks = sectionalSplits ? ranksByHorse(sectionalSplits, runner.horseId) : [];

  const facets: JockeyReportFacet[] = [];
  facets.push(evalGateBreak(runner, ranks, fieldSize));
  facets.push(evalPaceSetting(runner, ranks));
  facets.push(evalPositioning(runner, ranks));
  facets.push(evalTacticalExecution(runner, ranks, finishPosition));
  facets.push(evalClosingKick(runner, ranks, finishPosition));
  facets.push(evalEnergyManagement(runner, ranks, finishPosition));
  facets.push(evalTrafficHandling(runner, ranks));
  facets.push(evalCourseKnowledge(runner));
  facets.push(evalHorseAffinity(runner));

  const facetAvg = avg(facets.map((f) => f.score));
  facets.push(evalOverall(runner, finishPosition, fieldSize, facetAvg));

  const averageScore = avg(facets.map((f) => f.score));

  return {
    horseId: runner.horseId,
    horseName: runner.name,
    jockeyName: runner.jockeyName ?? runner.jockey?.name ?? "Unknown Jockey",
    jockeyId: runner.jockey?.id,
    finishPosition,
    fieldSize,
    averageScore,
    averageGrade: gradeFromScore(averageScore),
    facets,
  };
}

export function gradeColorClass(grade: JockeyReportGrade): string {
  switch (grade) {
    case "A+":
      return "text-fame border-fame/50 bg-fame/10";
    case "A":
      return "text-success border-success/50 bg-success/10";
    case "B":
      return "text-broadcast-accent border-broadcast-accent/40 bg-broadcast-accent/10";
    case "C":
      return "text-cream border-white/20 bg-white/5";
    case "D":
      return "text-warning border-warning/40 bg-warning/10";
    case "F":
      return "text-destructive border-destructive/40 bg-destructive/10";
  }
}
