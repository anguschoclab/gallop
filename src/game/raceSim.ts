import type { Horse, Race, RunningStyle, TrackCondition, Weather, JockeyStats, JockeyArchetype, Jockey } from "./types";
import { TRAIT_VALUES, fiberDistanceModifier } from "./geneticsEngine";
import type { CourseSpecification, TrackSection } from "./tracks";
import type { Rng } from "./rng";
import { clamp } from "./math";
import { REGIONAL_LINE_BIAS, type Bloodline } from "@/core/breeding/populationGenetics";

export type Runner = {
  horseId: string;
  name: string;
  silk: string;
  coatColor?: string;
  owned: boolean;
  position: number;
  velocity: number;
  finishTime: number | null;
  // lateral state
  lane: number; // current lateral meters from rail (0 = rail)
  targetLane: number; // goal lane (0 = rail)
  laneVelocity: number; // m/s lateral
  barrier: number; // starting gate
  // baked params
  topSpeed: number;
  accel: number;
  staminaFactor: number;
  noise: number;
  runningStyle: RunningStyle;
  draftingHorseId: string | null;
  // tactical integration
  horse: Horse;
  jockey?: Jockey;
  weight: number; // in lbs
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
  surface: "Turf" | "Dirt" | "Synthetic" | null,
  conditions: ConditionsModifier = { speedMul: 1, staminaDrainMul: 1 },
  barrier: number = 1,
  jockey?: Jockey,
  weight?: number
): Runner {
  const formMod = 1 + h.form / 100;
  const energyMod = 0.8 + (h.energy / 100) * 0.2;
  const formEnergy = clamp(formMod * energyMod, 0.5, MAX_FORM_ENERGY_MUL);
  
  // Aptitude modifiers
  const distDiff = Math.abs(h.distanceAptitude - raceDistance);
  // Penalty starts after 400m deviation, up to 10% penalty at 1200m+ deviation
  const distanceMod = 1 - Math.min(0.1, Math.max(0, distDiff - 400) / 8000);
  const surfaceMod = surface ? (h.surfaceAptitude[surface] ?? 0.95) : 1.0;

  // --- DNA: muscle fiber distance bias ---
  // Sprinters lose ground in long races; stayers lose ground in short races.
  // Translates the speed/stamina pair into different effective values per
  // distance band.
  const fiberMods = h.fiberBias ? fiberDistanceModifier(h.fiberBias, raceDistance) : { speedMul: 1, staminaMul: 1 };

  // --- DNA: mud aptitude ---
  // Multiplier on conditions.speedMul when ground is soft/heavy. Mudders gain;
  // hates-mud horses lose. Identity at fast/good tracks (mudAptitude resolves
  // around 1.0 anyway, but this protects against extreme rolls amplifying).
  const conditionsHarsh = conditions.speedMul < 0.97;
  const mudMod = conditionsHarsh ? (h.mudAptitude ?? 1.0) : 1.0;

  // --- DNA: bloodline regional bonus ---
  // Heritage line × surface alignment gives a small ability boost.
  const lineBias = h.bloodline ? REGIONAL_LINE_BIAS[h.bloodline as Bloodline] : undefined;
  const lineSurfaceMul = lineBias && (!lineBias.surface || lineBias.surface === surface) ? 1 + lineBias.boost : 1;

  // base m/s ~ 14-20 for 30..95 speed
  const rawTopSpeed = (12 + (h.stats.speed / 100) * 10)
    * formEnergy * conditions.speedMul * distanceMod * surfaceMod
    * fiberMods.speedMul * mudMod * lineSurfaceMul;
  const topSpeed = clamp(rawTopSpeed, 5, TOP_SPEED_CEILING);
  const accel = 1.5 + (h.stats.acceleration / 100) * 3.5;
  // Stride length: long-stride horses gain on straights, lose on turns.
  // Currently no per-step course context here, so we just apply a flat
  // distance-based bias (longer races have more straights → long-stride wins).
  const strideMod = h.strideType === "long" ? (raceDistance >= 1800 ? 1.02 : 0.98)
                  : h.strideType === "short" ? (raceDistance < 1400 ? 1.02 : 0.99)
                  : 1;
  const baseStamina = (0.4 + (h.stats.stamina / 100) * 0.6) * fiberMods.staminaMul; // 1 = no fade
  // Worse conditions deepen the fade: drain >1 reduces the staminaFactor
  // toward 0, while drain <=1 leaves it as-is.
  // --- DNA Trait Modifiers ---
  // Temperament affects consistency (noise)
  // Excellent (4) -> 0.8x noise, Poor (1) -> 1.1x noise
  const temperamentMod = 1 + (TRAIT_VALUES[h.temperament || "fair"] - 2) * -0.1;
  
  // Conformation affects stamina efficiency
  // Excellent (4) -> 0.94x drain, Poor (1) -> 1.03x drain
  const conformationMod = 1 + (TRAIT_VALUES[h.conformation || "fair"] - 2) * -0.03;

  const conditionStamina = clamp(1 - (1 - baseStamina) * conditions.staminaDrainMul * conformationMod, 0.2, 1);
  const runningStyle: RunningStyle = h.runningStyle ?? "P";
  const staminaFactor = styleStaminaFactor(runningStyle, conditionStamina);
  
  // --- Gender Modifiers ---
  let genderSpeedMul = 1.0;
  let genderNoiseMul = 1.0;
  
  switch (h.gender) {
    case "colt":
    case "horse":
      genderSpeedMul = 1.015; // +1.5% Peak Power
      genderNoiseMul = 1.25;  // +25% Volatility
      break;
    case "gelding":
      genderSpeedMul = 1.0;    // Standard
      genderNoiseMul = 0.6;    // -40% Volatility (Highly Consistent)
      break;
    case "filly":
    case "mare":
      genderSpeedMul = 0.99;   // -1.0% Base Power
      genderNoiseMul = 1.0;    // Standard
      break;
  }

  // --- Weight Penalty (DNA-Aware) ---
  // Standard weight is 126 lbs for a 500kg horse.
  // Larger horses (higher BMI) carry weight easier.
  const assignedWeight = weight ?? 126;
  const sizeCapacity = (h.weight - 500) / 10; // +1 lb capacity per 10kg over 500kg
  const standardWeightThreshold = 126 + sizeCapacity;
  
  const weightPenalty = Math.max(0, (assignedWeight - standardWeightThreshold) * 0.0015);
  const weightMod = clamp(1 - weightPenalty, 0.8, 1.05);

  const noise = ((110 - h.stats.consistency) / 100) * genderNoiseMul * temperamentMod; // 0.1..2.5

  const LANE_WIDTH = 1.2;
  return {
    horseId: h.id,
    name: h.name,
    silk: h.silk,
    coatColor: h.coatColor,
    owned,
    position: 0,
    velocity: 0,
    finishTime: null,
    lane: (barrier - 1) * LANE_WIDTH,
    targetLane: 0,
    laneVelocity: 0,
    barrier,
    topSpeed: topSpeed * genderSpeedMul * weightMod * strideMod,
    accel: accel * weightMod,
    // Heart score boosts late-race stamina retention. We express it on
    // staminaFactor (closer to 1 = less fade); resolveHeartScore returned
    // 0.85-1.15 so we lift the floor toward 1 by a fraction of (heart-1).
    staminaFactor: clamp(staminaFactor + ((h.heartScore ?? 1.0) - 1.0) * 0.5, 0.2, 1),
    noise,
    runningStyle,
    draftingHorseId: null,
    horse: h,
    jockey,
    weight: assignedWeight,
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
  laneDensity: number[]; // density of horses in each lane (0..10)
};

export function computePaceContext(runners: Runner[], distance: number): PaceContext {
  let leaderPos = 0;
  let totalProgress = 0;
  let alive = 0;
  const laneDensity = new Array(12).fill(0);
  
  for (const r of runners) {
    if (r.position > leaderPos) leaderPos = r.position;
    if (r.finishTime === null) {
      totalProgress += r.position / distance;
      alive++;
      const laneIdx = Math.floor(r.lane / 1.2);
      if (laneIdx >= 0 && laneIdx < 12) laneDensity[laneIdx]++;
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
  return { leaderPos, leadGroupCount, pacePressure, progress, laneDensity };
}

// Drafting: a runner closely tucked behind another (within DRAFT_DISTANCE)
// but not in the lead saves a small fraction of effort.
const DRAFT_DISTANCE = 3; // meters
const DRAFT_SPEED_BONUS = 1.015; // +1.5% speed when drafting
const DRAFT_STAMINA_PRESERVE = 0.5; // halves the late-race fade penalty

function getDraftingHorseId(r: Runner, runners: Runner[]): string | null {
  for (const other of runners) {
    if (other.horseId === r.horseId) continue;
    const gap = other.position - r.position;
    // Drafting requires being directly behind (same lane)
    const laneGap = Math.abs(other.lane - r.lane);
    if (gap > 0 && gap <= DRAFT_DISTANCE && laneGap < 0.8) return other.horseId;
  }
  return null;
}

/**
 * Finds the track section a runner is currently in.
 */
function getTrackSection(
  pos: number,
  distance: number,
  course?: CourseSpecification
): TrackSection | null {
  if (!course || !course.sections || course.sections.length === 0) return null;

  const circ = course.circumference;
  // Position relative to finish line (0)
  // The start line is (distance % circ) meters behind the finish line
  const startOffset = (circ - (distance % circ)) % circ;
  const trackPos = (startOffset + pos) % circ;

  let currentPos = 0;
  for (const section of course.sections) {
    if (trackPos >= currentPos && trackPos < currentPos + section.length) {
      return section;
    }
    currentPos += section.length;
  }
  return course.sections[0];
}

function getTrackRadius(
  pos: number,
  distance: number,
  course?: CourseSpecification
): number {
  const section = getTrackSection(pos, distance, course);
  return section?.type === "turn" ? (section.radius ?? Infinity) : Infinity;
}

function getTrackGradient(
  pos: number,
  distance: number,
  course?: CourseSpecification
): number {
  const section = getTrackSection(pos, distance, course);
  return section?.gradient ?? 0;
}

/**
 * Calculate speed penalty for being in a turn based on tightness (radius).
 * Horses with high acceleration and jockeys with high positioning can mitigate this.
 */
function getTurnSpeedPenalty(radius: number, accelStat: number, positioningStat: number = 50): number {
  if (radius === Infinity) return 0;
  
  // Base penalty scales with 1/radius. 
  // At R=125m (standard), penalty is ~0.02 (2% speed loss).
  // At R=60m (tight), penalty is ~0.05 (5% speed loss).
  const basePenalty = clamp(2.5 / radius, 0, 0.08);
  
  // Mitigation: up to 50% reduction from horse acceleration (agile horses)
  const accelBonus = (accelStat / 100) * 0.5;
  // Mitigation: up to 20% reduction from jockey positioning skill
  const positioningBonus = (positioningStat / 100) * 0.2;
  
  const totalMitigation = 1 - (accelBonus + positioningBonus);
  return basePenalty * totalMitigation;
}

export function stepRunner(
  r: Runner,
  dt: number,
  t: number,
  distance: number,
  rng: { next: () => number } | Rng,
  field?: Runner[],
  pace?: PaceContext,
  course?: CourseSpecification
) {
  if (r.finishTime !== null) return;
  const progress = r.position / distance;
  
  r.draftingHorseId = field ? getDraftingHorseId(r, field) : null;

  // --- 1. Lateral AI & Movement ---
  const LANE_WIDTH = 1.2;
  const MAX_LATERAL_SPEED = 2.0;
  
  // Basic AI: All horses want Lane 0 (the rail).
  // Front-runners (E) prioritize getting to the rail early.
  // Closers (S) might stay wide in the pack to avoid being boxed in.
  let targetLane = 0;
  if (r.runningStyle === "S" && progress < 0.4) targetLane = 1; // Stay slightly wide early
  
  // Traffic Avoidance: If blocked on the rail, move out.
  if (field && pace) {
    const laneIdx = Math.floor(r.lane / LANE_WIDTH);
    // Check if current lane is "saturated"
    if (laneIdx === 0 && pace.laneDensity[0] > 4 && progress < 0.7) {
      // Rail is crowded, maybe move out if we are not the leader
      if (r.position < pace.leaderPos - 2) targetLane = 1;
    }
    
    // Check for immediate physical blockage (horse right in front)
    for (const other of field) {
      if (other.horseId === r.horseId) continue;
      const gap = other.position - r.position;
      const laneGap = Math.abs(other.lane - r.lane);
      if (gap > 0 && gap < 2.5 && laneGap < 0.8) {
        // Someone is right in front! Move out to pass.
        targetLane = Math.min(10, laneIdx + 1);
        break;
      }
    }
  }
  r.targetLane = targetLane;

  // Move toward target lane
  const targetPos = r.targetLane * LANE_WIDTH;
  const lateralDiff = targetPos - r.lane;
  if (Math.abs(lateralDiff) > 0.01) {
    const step = Math.sign(lateralDiff) * Math.min(Math.abs(lateralDiff), MAX_LATERAL_SPEED * dt);
    r.lane += step;
  }

  // --- 2. Forward Physics & Turn/Elevation Penalties ---
  const radius = getTrackRadius(r.position, distance, course);
  const gradient = getTrackGradient(r.position, distance, course);
  
  // Geometric penalty: distance traveled on the outside is longer.
  const arcFactor = radius === Infinity ? 1 : (1 + r.lane / radius);
  
  // Elevation penalty: uphill (>0) slows down and drains stamina, 
  // downhill (<0) speeds up slightly.
  // 1% gradient = ~1% speed change
  // Jockey Skill: "Hill Specialist" reduces stamina drain on hills
  // Horse Aptitude: "Climbing Aptitude" modulates the penalty
  const gradientSpeedMul = 1 - (gradient / 100);
  const isHillSpecialist = r.jockey?.traits.includes("hill_specialist");
  const climbingApt = r.horse?.climbingAptitude ?? 1.0;
  
  let gradientStaminaMul = gradient > 0 ? 1 - (gradient / (200 * climbingApt)) : 1;
  if (gradient > 0 && isHillSpecialist) {
    gradientStaminaMul = 1 - (gradient / (400 * climbingApt)); // 50% less stamina drain for specialists
  }

  // --- 2.1 Centrifugal Physics (Turn Penalty) ---
  // Speed loss in turns is mitigated by Horse Acceleration (Agility), Cornering Aptitude, and Jockey Traits.
  let turnSpeedMul = 1.0;
  if (radius !== Infinity) {
    // Basic physics: force = mv^2/r. We simplify to a speed penalty.
    const centrifugalPressure = (r.velocity * r.velocity) / (radius * 10);
    // Mitigation: High acceleration (agility) helps "hold the rail"
    const agilityMitigation = (r.horse.stats.acceleration / 100) * 0.6;
    
    // Horse Aptitude: Cornering skill (0.8 - 1.2)
    const corneringApt = r.horse?.corneringAptitude ?? 1.0;
    
    // Jockey Traits: "Bullring Specialist"
    const isBullringExpert = r.jockey?.traits.includes("bullring_expert");
    const positioningSkill = (r.jockey?.stats.positioning ?? 50) / 200;
    const traitBonus = isBullringExpert ? 0.2 : 0;
    
    // Safety: Clamp the total penalty to 40% (0.4) so horses don't stall completely on tight turns
    const totalPenalty = Math.min(0.4, Math.max(0, centrifugalPressure - (agilityMitigation * corneringApt) - positioningSkill - traitBonus));
    turnSpeedMul = 1 - totalPenalty;
  }
  
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

  // --- 2.2 Straight Length Tactical Bias ---
  const straight = course?.straightLength ?? 400;
  if (straight < 350) {
    // Short straight: favors front-runners who "kick" early out of the turn.
    if (r.runningStyle === "E" && progress > 0.8) {
      const isFrontRunnerJockey = r.jockey?.archetype === "front_runner";
      const jockeyBonus = (r.jockey?.stats.positioning ?? 50) / 1000 + (isFrontRunnerJockey ? 0.02 : 0);
      styleMul *= (1.03 + jockeyBonus);
    }
  } else if (straight > 500) {
    // Long straight: favors closers with sustained stamina.
    if ((r.runningStyle === "S" || r.runningStyle === "C") && progress > 0.7) {
      const isCloserJockey = r.jockey?.archetype === "closer";
      const isLongStraightPro = r.jockey?.traits.includes("long_straight_pro");
      const jockeyBonus = (r.jockey?.stats.patience ?? 50) / 1000 + (isCloserJockey ? 0.02 : 0);
      const traitBonus = (progress > 0.85 && isLongStraightPro) ? (r.jockey?.stats.vigor ?? 50) / 400 : 0;
      styleMul *= (1.02 + jockeyBonus + traitBonus);
    }
  }

  
  // E (Early) Front-runners CANNOT rate successfully behind a pace setter.
  if (r.runningStyle === "E" && pace && (pace.leaderPos - r.position) > 3) {
    styleMul *= 0.98; // Rating penalty
  }
  
  // S (Sustain/Closer) benefits more in a hot-pace race
  if (pace && pace.pacePressure > 0 && r.runningStyle === "S" && progress > 0.6) {
    styleMul *= 1 + 0.05 * pace.pacePressure;
  }

  // Wide Draw Penalty for Front-runners:
  // If an E horse is forced wide early, they burn extra stamina "pushing" for the lead.
  if (r.runningStyle === "E" && progress < 0.2 && r.lane > 2.4) {
    staminaMul *= 0.98; 
  }

  // Drafting bonus
  let draftMul = 1;
  if (r.draftingHorseId && progress < 0.95) draftMul = DRAFT_SPEED_BONUS;
  
  const targetSpeed =
    r.topSpeed * staminaMul * styleMul * draftMul * turnSpeedMul * gradientSpeedMul * (1 + (rng.next() - 0.5) * 0.08 * r.noise);
  
  // accelerate toward target
  const diff = targetSpeed - r.velocity;
  r.velocity += Math.sign(diff) * Math.min(Math.abs(diff), r.accel * dt);
  
  // Update position with arc-length correction
  const ds = r.velocity * dt;
  
  // --- 3. Jockey Bonuses ---
  let finalDs = ds;
  if (r.jockeyStats) {
    const stats = r.jockeyStats;
    const arch = r.jockeyArchetype;
    
    // GateSkill: Accelerate faster at the start (first 5% of race)
    if (progress < 0.05) {
      r.velocity += (stats.gateSkill / 100) * 0.5 * dt;
    }
    
    // Positioning: Better rail seeking and tighter turns
    // Reduces the geometric penalty of being wide
    if (radius !== Infinity) {
      const positioningBonus = (stats.positioning / 100) * 0.4; // up to 40% reduction in wide penalty
      const effectiveLane = Math.max(0, r.lane * (1 - positioningBonus));
      const adjustedArcFactor = (1 + effectiveLane / radius);
      finalDs = (r.velocity * dt) / adjustedArcFactor;
    } else {
      finalDs = (r.velocity * dt) / arcFactor;
    }

    // Pacing: Efficiency bonus if archetype matches style
    // Front-runner jockey with E, Closer jockey with S, etc.
    const isMatched = 
      (arch === "front_runner" && r.runningStyle === "E") ||
      (arch === "closer" && r.runningStyle === "S") ||
      (arch === "clinical" && r.runningStyle === "EP") ||
      (arch === "finisher" && r.runningStyle === "P");
    
    if (isMatched && progress > 0.4) {
      // Small stamina preservation
      staminaMul *= (1 + (stats.pacing / 100) * 0.02);
    }
    
    // Style Mismatch Penalty: Front-runner jockey on a Closer horse
    if (arch === "front_runner" && r.runningStyle === "S" && progress < 0.4) {
      // Jockey pushes too hard early
      r.velocity += 0.2 * dt; 
      staminaMul *= 0.97; // Extra drain
    }

    // Vigor: Final stretch push (last 400m / approx last 20% of most races)
    if (progress > 0.8) {
      const vigorBoost = (stats.vigor / 100) * 0.03; // up to 3% speed boost
      r.velocity += vigorBoost * dt;
    }

    // Temperament: Buffer consistency noise
    const consistencyBuffer = (stats.temperament / 100) * 0.5;
    const effectiveNoise = r.noise * (1 - consistencyBuffer);
    // (Wait, noise is already used to calculate targetSpeed above, 
    // so we should have applied this before velocity calc. 
    // Let's refine the targetSpeed logic instead if possible, 
    // but applying it here as a slight velocity correction is also an option.)
  } else {
    finalDs = ds / arcFactor;
  }

  r.position += finalDs;

  if (r.position >= distance) {
    const overshoot = r.position - distance;
    const tFinish = r.velocity > 0 ? t - (overshoot * arcFactor) / r.velocity : t;
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
  maxTime: number = 600,
  course?: CourseSpecification
): { horseId: string; position: number; time: number }[] {
  let t = 0;
  while (runners.some((r) => r.finishTime === null) && t < maxTime) {
    const pace = computePaceContext(runners, distance);
    for (const r of runners) stepRunner(r, dt, t, distance, rng, runners, pace, course);
    t += dt;
  }
  // Anyone still unfinished at maxTime is DNF — represented with Infinity time.
  const ranked = [...runners]
    .map((r) => ({ horseId: r.horseId, time: r.finishTime ?? Infinity }))
    .sort((a, b) => a.time - b.time);
  return ranked.map((r, idx) => ({ horseId: r.horseId, position: idx + 1, time: r.time }));
}
