// Stable Staff Types - Management and bonus definitions

/**
 * Staff roles within a stable
 */
export type StaffRole = 'veterinarian' | 'farrier' | 'nutritionist' | 'groom' | 'trainer';

/**
 * Staff experience and quality tiers
 */
export type StaffTier = 'budget' | 'mid' | 'elite';

/**
 * Individual staff member details
 */
export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  tier: StaffTier;
  salary: number; // Weekly salary in currency
  bonusValue: number; // 0.0 to 1.0 multiplier/modifier magnitude
  traits: string[]; // Specialized skills (e.g., 'colic_expert', 'dirt_specialist')
  fame: number; // 0-100 reputation of the staff member
  contractUntil?: number; // Optional day when contract expires
  stableId?: string; // ID of the stable they are currently hired by
}

/**
 * Staff hire/fire results
 */
export interface StaffActionResult {
  ok: boolean;
  reason?: string;
  staffId?: string;
}
