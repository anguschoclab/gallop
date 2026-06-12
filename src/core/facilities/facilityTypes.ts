/**
 * facilityTypes.ts - Facility type definitions and constants
 *
 * This file provides type definitions for facilities, facility levels, and constant data
 * for bonuses, maintenance costs, upgrade costs, and enabled workouts.
 *
 * Dependencies: None (self-contained types and constants)
 * Related files: facilityDefaults.ts (uses types and constants), index.ts (re-exports types)
 */

// Facility Types - Infrastructure system for racing stables
// Facilities affect training effectiveness, recovery, injury healing, and racing operations

/**
 * Facility quality levels
 * - basic: No bonus, minimal maintenance
 * - standard: +10% effectiveness, moderate maintenance
 * - premium: +25% effectiveness, high maintenance
 * - elite: +40% effectiveness, very high maintenance
 */
export type FacilityLevel = "basic" | "standard" | "premium" | "elite";

/**
 * Types of facilities available to stables
 */
export type FacilityType =
  | "main_track" // Training effectiveness for all workouts
  | "barn" // Recovery speed (energy regen)
  | "exercise_pool" // Enables swimming workouts, reduces injury risk
  | "treadmill" // Enables treadmill workouts, controlled conditions
  | "veterinary_clinic" // Injury recovery speed, health check quality
  | "starting_gates" // Enables gate work training, improves starts
  | "transport" // Travel cost reduction, logistics efficiency
  | "spa" // Post-race recovery, form regeneration
  | "nutrition_lab" // Feed quality, growth optimization
  | "rehab_center"; // Extended injury recovery options

/**
 * Individual facility data
 */
export interface Facility {
  type: FacilityType;
  level: FacilityLevel;
  maintenanceCost: number; // Daily cost to maintain
  upgradeCost: number; // One-time cost to upgrade to next level
  builtDay: number; // When facility was built/upgraded
}

/**
 * Collection of facilities for a stable
 * Player and NPC stables both have facilities
 */
export type PlayerFacilities = Record<FacilityType, Facility | undefined>;

/**
 * Facility bonus multipliers by level
 */
export const FACILITY_BONUSES: Record<FacilityLevel, number> = {
  basic: 0,
  standard: 0.1,
  premium: 0.25,
  elite: 0.4,
};

/**
 * Facility maintenance costs per day by level
 */
export const FACILITY_MAINTENANCE_COSTS: Record<FacilityLevel, number> = {
  basic: 10,
  standard: 25,
  premium: 60,
  elite: 150,
};

/**
 * Facility upgrade costs (one-time) by level
 * To upgrade FROM this level to the next
 */
export const FACILITY_UPGRADE_COSTS: Record<FacilityLevel, number | null> = {
  basic: 5000, // Upgrade basic -> standard
  standard: 15000, // Upgrade standard -> premium
  premium: 50000, // Upgrade premium -> elite
  elite: null, // Cannot upgrade from elite
};

/**
 * Human-readable facility names
 */
export const FACILITY_NAMES: Record<FacilityType, string> = {
  main_track: "Main Training Track",
  barn: "Stable Barn",
  exercise_pool: "Exercise Pool",
  treadmill: "Treadmill Facility",
  veterinary_clinic: "Veterinary Clinic",
  starting_gates: "Starting Gates",
  transport: "Transport Fleet",
  spa: "Equine Spa & Wellness",
  nutrition_lab: "Nutrition Laboratory",
  rehab_center: "Rehabilitation Center",
};

/**
 * Facility descriptions for UI
 */
export const FACILITY_DESCRIPTIONS: Record<FacilityType, string> = {
  main_track: "Quality surface for daily workouts. Higher levels enable better training gains.",
  barn: "Stabling facilities affect daily energy recovery and horse comfort.",
  exercise_pool: "Hydrotherapy and swimming workouts. Reduces joint stress and injury risk.",
  treadmill: "Controlled environment training. Enables precise workout conditions.",
  veterinary_clinic: "On-site medical care accelerates injury recovery and health monitoring.",
  starting_gates: "Practice starting gates. Improves race day breaks and early speed.",
  transport: "Fleet of horse transport vehicles. Reduces travel costs and stress.",
  spa: "Post-race recovery facilities. Improves form regeneration between races.",
  nutrition_lab: "Custom feed formulations optimize growth and conditioning.",
  rehab_center: "Advanced therapy for serious injuries. Extended recovery options.",
};

/**
 * Which workout types each facility enables
 */
export const FACILITY_ENABLED_WORKOUTS: Record<FacilityType, string[]> = {
  main_track: ["speed", "stamina", "acceleration", "bullet", "breeze", "gallop"],
  barn: [], // Passive effect only
  exercise_pool: ["swimming"],
  treadmill: ["treadmill"],
  veterinary_clinic: [], // Passive effect only
  starting_gates: ["gate_work"],
  transport: [], // Passive effect only
  spa: [], // Passive effect only
  nutrition_lab: [], // Passive effect only
  rehab_center: [], // Passive effect only
};
