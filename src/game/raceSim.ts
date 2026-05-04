import type { Horse, Race, RunningStyle, TrackCondition, Weather } from "./types";
import type { Rng } from "./rng";
import { clamp } from "./math";

export type Runner = {
  horseId: string;
  name: string;
  silk: string;
  coatColor?: string; // For race viewer sprite selection
  owned: boolean;
  position: number; // meters traveled
  velocity: number;
  finishTime: number | null;
  // baked params
  topSpeed: number; // m/s
  accel: number;
  staminaFactor: number;
  noise: number;
  runningStyle: RunningStyle;
  draftingHorseId: string | null;
};

// Style-driven pace shape. Each entry returns a multiplier on target speed
// based on race progress (0 at the gate, 1 at the wire).
// Maps to standard E, E/P, P, S run styles:
//   front-runner (E):   Vies for early lead. 1.05 at start, decaying to ~0.98.
//   stalker (E/P):      Runs 2nd/3rd early. Starts strong (1.01), rates successfully (steady).
//   mid-pack (P):       Middle of pack early. Mild start (0.98), strong middle (1.02), steady finish.
//   closer (S):         Back of pack early. Conservative start (0.93), big surge late (1.07).
function paceShapeMul(style: RunningStyle, progress: number): number {
  switch (style) {
    case "E":
      return 1.05 - 0.07 * progress;
    case "EP":
      return 1.01 - 0.02 * progress;
    case "P":
      return 0.98 + 0.04 * Math.sin(Math.PI * progress);
    case "S":
      if (progress < 0.6) return 0.93 + 0.05 * progress;
      return 0.96 + 0.11 * ((progress - 0.6) / 0.4);
  }
}

// How much energy the style burns during the early portion of the race.
// Front-runners deepen their stamina fade because they pushed early; closers
// preserve it for the final surge.
function styleStaminaFactor(style: RunningStyle, baseStaminaFactor: number): number {
  switch (style) {
    case "E":
      return clamp(baseStaminaFactor - 0.05, 0.2, 1);
    case "EP":
      return baseStaminaFactor;
    case "P":
      return baseStaminaFactor;
    case "S":
      return clamp(baseStaminaFactor + 0.05, 0.2, 1);
  }
}

export type ConditionsModifier = {
  speedMul: number; // multiplies top speed
  staminaDrainMul: number; // scales fade depth (>1 = harsher fade)
};

const TRACK_SPEED_MUL: Record<TrackCondition, number> = {
  fast: 1.0,
  good: 0.985,
  soft: 0.95,
  heavy: 0.93,
};

const WEATHER_SPEED_MUL: Record<Weather, number> = {
  sunny: 1.0,
  cloudy: 1.0,
  sunset: 1.0,
  night: 0.99,
  rainy: 0.97,
};

const WEATHER_DRAIN_MUL: Record<Weather, number> = {
  sunny: 1.0,
  cloudy: 1.0,
  sunset: 1.0,
  night: 1.0,
  rainy: 1.06,
};

export function getConditionsModifier(race: Pick<Race, "weather" | "trackCondition">): ConditionsModifier {
  const trackMul = race.trackCondition ? TRACK_SPEED_MUL[race.trackCondition] : 1;
  const weatherSpeedMul = race.weather ? WEATHER_SPEED_MUL[race.weather] : 1;
  const weatherDrainMul = race.weather ? WEATHER_DRAIN_MUL[race.weather] : 1;
  // Soft/heavy tracks also fatigue runners faster.
  const trackDrainMul = trackMul < 1 ? 1 + (1 - trackMul) * 1.5 : 1;
  return {
    speedMul: trackMul * weatherSpeedMul,
    staminaDrainMul: weatherDrainMul * trackDrainMul,
  };
}

// Cap on the combined form/energy multiplier so a fully-fit/in-form horse
// can't push topSpeed beyond a sane physical ceiling.
const MAX_FORM_ENERGY_MUL = 1.25;
// Hard ceiling on topSpeed (m/s). Real thoroughbreds peak around ~19 m/s.
const TOP_SPEED_CEILING = 22;

export function buildRunner(
  h: Horse,
  owned: boolean,
  raceDistance: number,
  surface?: "Turf" | "Dirt" | "Synthetic",
  conditions: ConditionsModifier = { speedMul: 1, staminaDrainMul: 1 }
): Runner {
  const formMod = 1 + h.form / 100;
  const energyMod = 0.8 + (h.energy / 100) * 0.2;
  const formEnergy = clamp(formMod * energyMod, 0.5, MAX_FORM_ENERGY_MUL);
  
  // Aptitude modifiers
  const distDiff = Math.abs(h.distanceAptitude - raceDistance);
  // Penalty starts after 400m deviation, up to 10% penalty at 1200m+ deviation
  const distanceMod = 1 - Math.min(0.1, Math.max(0, distDiff - 400) / 8000);
  const surfaceMod = surface ? (h.surfaceAptitude[surface] ?? 0.95) : 1.0;

  // base m/s ~ 14-20 for 30..95 speed
  const rawTopSpeed = (12 + (h.stats.speed / 100) * 10) * formEnergy * conditions.speedMul * distanceMod * surfaceMod;
  const topSpeed = clamp(rawTopSpeed, 5, TOP_SPEED_CEILING);
  const accel = 1.5 + (h.stats.acceleration / 100) * 3.5;
  const baseStamina = 0.4 + (h.stats.stamina / 100) * 0.6; // 1 = no fade
  // Worse conditions deepen the fade: drain >1 reduces the staminaFactor
  // toward 0, while drain <=1 leaves it as-is.
  const conditionStamina = clamp(1 - (1 - baseStamina) * conditions.staminaDrainMul, 0.2, 1);
  const runningStyle: RunningStyle = h.runningStyle ?? "P";
  const staminaFactor = styleStaminaFactor(runningStyle, conditionStamina);
  const noise = (110 - h.stats.consistency) / 100; // 0.1..1
  return {
    horseId: h.id,
    name: h.name,
    silk: h.silk,
    coatColor: h.coatColor,
    owned,
    position: 0,
    velocity: 0,
    finishTime: null,
    topSpeed,
    accel,
    staminaFactor,
    noise,
    runningStyle,
    draftingHorseId: null,
  };
}

// Per-step shared state across the field — recomputed every tick. Used to
// model pace pressure (front-runners crowding the lead pay a stamina cost)
// and drafting (runners just behind another get a small slipstream boost).
export type PaceContext = {
  leaderPos: number;
  leadGroupCount: number; // runners within 4m of the leader
  pacePressure: number; // 0..1 — how hot the early pace is
  progress: number; // mean progress through the race (0..1)
};

export function computePaceContext(runners: Runner[], distance: number): PaceContext {
  let leaderPos = 0;
  let totalProgress = 0;
  let alive = 0;
  for (const r of runners) {
    if (r.position > leaderPos) leaderPos = r.position;
    if (r.finishTime === null) {
      totalProgress += r.position / distance;
      alive++;
    } else {
      totalProgress += 1;
    }
  }
  let leadGroupCount = 0;
  let frontRunnersInLeadGroup = 0;
  for (const r of runners) {
    if (r.finishTime !== null) continue;
    if (leaderPos - r.position <= 4) {
      leadGroupCount++;
      if (r.runningStyle === "E") frontRunnersInLeadGroup++;
    }
  }
  // Hot pace if multiple front-runners contest the lead simultaneously.
  // 0 → no pressure, 1 → 3+ front-runners battling.
  const pacePressure = clamp((frontRunnersInLeadGroup - 1) / 2, 0, 1);
  const progress = alive > 0 ? totalProgress / runners.length : 1;
  return { leaderPos, leadGroupCount, pacePressure, progress };
}

// Drafting: a runner closely tucked behind another (within DRAFT_DISTANCE)
// but not in the lead saves a small fraction of effort. Mirrors the real
// "tucking in" tactic that closers and stalkers exploit.
const DRAFT_DISTANCE = 3; // meters
const DRAFT_SPEED_BONUS = 1.015; // +1.5% speed when drafting
const DRAFT_STAMINA_PRESERVE = 0.5; // halves the late-race fade penalty

function getDraftingHorseId(r: Runner, runners: Runner[]): string | null {
  for (const other of runners) {
    if (other.horseId === r.horseId) continue;
    const gap = other.position - r.position;
    if (gap > 0 && gap <= DRAFT_DISTANCE) return other.horseId;
  }
  return null;
}

export function stepRunner(
  r: Runner,
  dt: number,
  t: number,
  distance: number,
  rng: { next: () => number } | Rng,
  field?: Runner[],
  pace?: PaceContext
) {
  if (r.finishTime !== null) return;
  const progress = r.position / distance;
  
  r.draftingHorseId = field ? getDraftingHorseId(r, field) : null;

  // stamina curve: full speed early, fade in last 40% based on stamina
  let staminaMul = 1;
  if (progress > 0.6) {
    const fade = (progress - 0.6) / 0.4; // 0..1
    let effectiveStamina = r.staminaFactor;
    // Drafting preserves stamina in the back/middle of the field.
    if (r.draftingHorseId) {
      effectiveStamina = effectiveStamina + (1 - effectiveStamina) * DRAFT_STAMINA_PRESERVE;
    }
    // Pace pressure: front-runners in a hot pace burn out harder.
    if (pace && pace.pacePressure > 0 && r.runningStyle === "E") {
      effectiveStamina = clamp(effectiveStamina - 0.08 * pace.pacePressure, 0.2, 1);
    }
    staminaMul = 1 - (1 - effectiveStamina) * fade;
  }
  let styleMul = paceShapeMul(r.runningStyle, progress);
  
  // E (Early) Front-runners CANNOT rate successfully behind a pace setter.
  // If they are not in the lead group (more than 3 meters behind the leader),
  // they lose their rhythm and suffer a rating penalty. EP Stalkers do not.
  if (r.runningStyle === "E" && pace && (pace.leaderPos - r.position) > 3) {
    styleMul *= 0.98; // Rating penalty
  }
  
  // S (Sustain/Closer) benefits more in a hot-pace race; their late surge is amplified.
  if (pace && pace.pacePressure > 0 && r.runningStyle === "S" && progress > 0.6) {
    styleMul *= 1 + 0.05 * pace.pacePressure;
  }
  // Drafting gives a small target-speed bump on top of the style/stamina mix.
  let draftMul = 1;
  if (r.draftingHorseId && progress < 0.95) draftMul = DRAFT_SPEED_BONUS;
  
  const targetSpeed =
    r.topSpeed * staminaMul * styleMul * draftMul * (1 + (rng.next() - 0.5) * 0.08 * r.noise);
  // accelerate toward target
  const diff = targetSpeed - r.velocity;
  r.velocity += Math.sign(diff) * Math.min(Math.abs(diff), r.accel * dt);
  r.position += r.velocity * dt;
  if (r.position >= distance) {
    // Interpolate finish time within the tick instead of rounding to the
    // discrete dt boundary — preserves sub-tick differences between runners.
    const overshoot = r.position - distance;
    const tFinish = r.velocity > 0 ? t - overshoot / r.velocity : t;
    r.position = distance;
    r.finishTime = tFinish;
  }
}

// Run a full race in-process (no animation) — used by tests and any headless
// resolution path. Deterministic given the same seed, runners, and dt.
export function runRaceToCompletion(
  runners: Runner[],
  distance: number,
  rng: Rng,
  dt: number = 0.1,
  maxTime: number = 600
): { horseId: string; position: number; time: number }[] {
  let t = 0;
  while (runners.some((r) => r.finishTime === null) && t < maxTime) {
    const pace = computePaceContext(runners, distance);
    for (const r of runners) stepRunner(r, dt, t, distance, rng, runners, pace);
    t += dt;
  }
  // Anyone still unfinished at maxTime is DNF — represented with Infinity time.
  const ranked = [...runners]
    .map((r) => ({ horseId: r.horseId, time: r.finishTime ?? Infinity }))
    .sort((a, b) => a.time - b.time);
  return ranked.map((r, idx) => ({ horseId: r.horseId, position: idx + 1, time: r.time }));
}
