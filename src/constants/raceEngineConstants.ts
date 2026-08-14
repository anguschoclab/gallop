/** Default simulation time step in seconds. */
export const DEFAULT_DT = 0.1;

/**
 * Compute a safe maxTime (seconds) for a race of the given distance.
 * Ensures long races (e.g. 2400m+) always have headroom to finish.
 *
 * @param distance — race distance in meters
 * @returns maximum simulation duration in seconds
 */
export function defaultMaxTime(distance: number): number {
  return Math.max(120, distance / 5 + 60);
}

export const TOP_SPEED_CEILING = 22;

export const MAX_FORM_ENERGY_MUL = 1.25;

export const DRAFT_DISTANCE = 3;
export const DRAFT_SPEED_BONUS = 1.015;
export const DRAFT_STAMINA_PRESERVE = 0.5;

export const LANE_WIDTH = 1.2;
export const MAX_LATERAL_SPEED = 2.0;

export const LANE_GAP_THRESHOLD = 0.8;
export const POSITION_GAP_THRESHOLD = 2.5;
export const LATERAL_DIFF_THRESHOLD = 0.01;

export const STALKER_PROGRESS_THRESHOLD = 0.4;
export const OUTSIDE_PROGRESS_THRESHOLD = 0.8;
export const LEAD_PROGRESS_THRESHOLD = 0.2;
export const CONGESTED_LANE_PROGRESS_THRESHOLD = 0.7;
export const CONGESTED_LANE_DENSITY_THRESHOLD = 4;
export const LANE_POSITION_GAP_THRESHOLD = 2;

export const AGILITY_MITIGATION_FACTOR = 0.6;
export const POSITIONING_SKILL_FACTOR = 0.5;
export const BULLRING_TRAIT_BONUS = 0.2;
export const MAX_TURN_PENALTY = 0.4;

export const STAMINA_FADE_START = 0.6;
export const STAMINA_FADE_DURATION = 0.4;
export const PACE_PRESSURE_STAMINA_PENALTY = 0.08;
export const BLEEDER_DISTANCE_THRESHOLD = 1600;
export const BLEEDER_PROGRESS_THRESHOLD = 0.7;

export const BLEEDER_RISK_PER_SEC = 5.0;
export const ROANER_RISK_PER_SEC = 3.0;

export const BLEEDER_STAMINA_PENALTY = 0.2;
export const ROANER_SPEED_THRESHOLD = 0.95;
export const ROANER_STAMINA_PENALTY = 0.15;
export const SAVE_TACTICS_PROGRESS_THRESHOLD = 0.7;
export const SAVE_TACTICS_STAMINA_BONUS = 0.1;
export const EARLY_SPEED_PENALTY_THRESHOLD = 0.2;
export const EARLY_SPEED_LANE_THRESHOLD = 2.4;
export const EARLY_SPEED_STAMINA_PENALTY = 0.98;

export const SHORT_STRAIGHT_THRESHOLD = 350;
export const LONG_STRAIGHT_THRESHOLD = 500;
export const FRONT_RUNNER_PROGRESS_THRESHOLD = 0.8;
export const CLOSER_PROGRESS_THRESHOLD = 0.7;
export const LATE_KICK_PROGRESS_THRESHOLD = 0.85;
export const LATE_KICK_BOOST_THRESHOLD = 0.92;
export const FRONT_RUNNER_BONUS = 0.02;
export const CLOSER_BONUS = 0.02;
export const FRONT_RUNNER_STYLE_MULTIPLIER = 1.03;
export const CLOSER_STYLE_MULTIPLIER = 1.02;
export const LATE_KICK_MULTIPLIER = 1.08;
export const POSITIONING_BONUS_FACTOR = 0.001;
export const PACING_BONUS_FACTOR = 0.001;
export const VIGOR_BONUS_FACTOR = 0.001;
export const LONG_STRAIGHT_VIGOR_THRESHOLD = 0.85;
export const LONG_STRAIGHT_VIGOR_FACTOR = 0.0025;
export const PACE_PRESSURE_STYLE_BONUS = 0.05;
export const STALKER_PACE_PRESSURE_THRESHOLD = 0.6;
export const FRONT_RUNNER_PACE_THRESHOLD = 3;
export const FRONT_RUNNER_STYLE_PENALTY = 0.98;
export const POSITIONING_BONUS_TURN = 0.4;
export const MATCHED_ARCHETYPE_PROGRESS_THRESHOLD = 0.4;
export const PACING_STAMINA_BONUS_FACTOR = 0.02;
export const FRONT_RUNNER_STALKER_MISMATCH_VELOCITY_BONUS = 0.2;
export const FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY = 0.97;
export const VIGOR_BOOST_FACTOR = 0.03;
export const VIGOR_PROGRESS_THRESHOLD = 0.8;
export const LATE_KICK_VIGOR_MULTIPLIER = 1.5;
export const GATE_SKILL_VELOCITY_BONUS = 0.005;
export const GATE_SKILL_PROGRESS_THRESHOLD = 0.05;

export const DECEL_FACTOR = 0.35;
export const LATE_KICK_TOP_SPEED_MULTIPLIER = 1.04;
export const MIN_BLOCK_GAP = 0.8;
export const INSIDE_OVERTAKE_DENSITY_ADVANTAGE = 1;

export const HARSH_CONDITION_SPEED_THRESHOLD = 0.97;

export const WIND_EFFECT_SCALE = 1300;
export const SPRINTER_WIND_MULTIPLIER = 1.3;
export const MAX_WIND_SPEED_MOD = 1.08;
export const MIN_WIND_SPEED_MOD = 0.92;
export const HEADWIND_STAMINA_PENALTY = 1.03;
export const TAILWIND_STAMINA_RELIEF = 0.97;

export const GATE_MASTER_TRAIT_BONUS = 0.3;

export const SURFACE_SPECIALIST_SPEED_BONUS = 0.02;

export const MUD_MASTER_SPEED_BONUS = 0.02;

export const SPRINT_SPECIALIST_DISTANCE_THRESHOLD = 1400;
export const SPRINT_SPECIALIST_SPEED_BONUS = 0.03;
export const SPRINT_SPECIALIST_LONG_PENALTY = 0.02;
export const STAYING_SPECIALIST_DISTANCE_THRESHOLD = 2200;
export const STAYING_SPECIALIST_SPEED_BONUS = 0.03;
export const STAYING_SPECIALIST_SHORT_PENALTY = 0.02;

export const PACE_PRESSER_MITIGATION = 0.5;

export const BIG_MATCH_FIELD_THRESHOLD = 12;
export const BIG_MATCH_VIGOR_BONUS = 0.05;

export const VETERAN_AGE_THRESHOLD = 35;
export const VETERAN_POSITIONING_BONUS = 0.1;

export const CLOSER_INSTINCT_PROGRESS_THRESHOLD = 0.85;
export const CLOSER_INSTINCT_STYLE_BONUS = 0.05;

export const PACE_BASE_VELOCITY = 18.5;

export const PACE_REFERENCE_DISTANCE = 3000;

export const PACE_DISTANCE_FACTOR = 2.5;

export const LEAD_GROUP_GAP = 4;

export const LANE_DENSITY_BUCKETS = 12;

export const LANE_BUCKET_WIDTH = 1.2;
