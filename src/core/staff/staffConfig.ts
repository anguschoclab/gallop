import type { StaffRole, StaffTier } from "./staffTypes";

export const STAFF_CONFIG = {
  veterinarian: {
    budget: { salary: 250, bonus: 0.1 },
    mid: { salary: 750, bonus: 0.25 },
    elite: { salary: 2000, bonus: 0.5 },
  },
  farrier: {
    budget: { salary: 150, bonus: 0.05 },
    mid: { salary: 450, bonus: 0.15 },
    elite: { salary: 1200, bonus: 0.3 },
  },
  nutritionist: {
    budget: { salary: 200, bonus: 0.1 },
    mid: { salary: 600, bonus: 0.2 },
    elite: { salary: 1500, bonus: 0.4 },
  },
  groom: {
    budget: { salary: 100, bonus: 0.15 },
    mid: { salary: 300, bonus: 0.3 },
    elite: { salary: 800, bonus: 0.6 },
  },
  trainer: {
    budget: { salary: 300, bonus: 0.1 },
    mid: { salary: 900, bonus: 0.25 },
    elite: { salary: 2500, bonus: 0.45 },
  },
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  veterinarian: "Veterinarian",
  farrier: "Farrier",
  nutritionist: "Nutritionist",
  groom: "Groom",
  trainer: "Trainer",
};

export const STAFF_TIER_LABELS: Record<StaffTier, string> = {
  budget: "Budget",
  mid: "Mid-Range",
  elite: "Elite",
};

/**
 * Get bonus value for a staff role and tier
 */
export function getStaffBonus(role: StaffRole, tier: StaffTier): number {
  return STAFF_CONFIG[role][tier].bonus;
}

/**
 * Get salary for a staff role and tier
 */
export function getStaffSalary(role: StaffRole, tier: StaffTier): number {
  return STAFF_CONFIG[role][tier].salary;
}
