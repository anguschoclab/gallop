/**
 * staff/staffTypes.ts - Stable staff types
 *
 * This file provides types for stable staff members including roles, tiers,
 * staff details, and action results.
 *
 * Dependencies: None
 * Related files: staffConfig.ts, staffGenerator.ts
 */

// Stable Staff Types - Management and bonus definitions

/**
 * Staff roles within a stable
 */
export type StaffRole = "veterinarian" | "farrier" | "nutritionist" | "groom" | "trainer";

/**
 * Staff experience and quality tiers
 */
export type StaffTier = "budget" | "mid" | "elite";

/**
 * Individual staff member details
 */
export interface StaffMember {
  id: import("@/core/types/branded").StaffId;
  name: string;
  role: StaffRole;
  tier: StaffTier;
  salary: number; // Weekly salary in currency
  bonusValue: number; // 0.0 to 1.0 multiplier/modifier magnitude
  traits: string[]; // Specialized skills (e.g., 'colic_expert', 'dirt_specialist')
  fame: number; // 0-100 reputation of the staff member
  contractUntil?: number; // Optional day when contract expires
  stableId?: import("@/core/types/branded").StableId; // ID of the stable they are currently hired by
  offended?: boolean; // True if player low-balled them and they walked away
  offendedUntil?: number; // Game day after which they are willing to talk again
  negotiationRounds?: number; // Number of insult rounds used in current negotiation

  // Race record tracking for trainers (Phase 4: Relationship Enhancement)
  raceRecord?: {
    wins: number;
    places: number; // 2nd place
    shows: number; // 3rd place
    starts: number; // Total races
  };
  specialties?: string[]; // "sprinter", "router", "turf", "dirt"
  specialtyWins?: Record<string, number>; // Track wins per specialty
}

/**
 * Staff hire/fire results
 */
export interface StaffActionResult {
  ok: boolean;
  reason?: string;
  staffId?: string;
}
