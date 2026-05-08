import type { Rng } from "@/game/rng";
import { generateUUID } from "@/game/uuid";
import type { StaffMember, StaffRole, StaffTier } from "./staffTypes";
import { STAFF_CONFIG } from "./staffConfig";

const STAFF_NAMES = [
  "Dr. Sarah Jenkins", "Mike 'Lefty' Malone", "Elena Rodriguez", "Dr. James Whitby",
  "Chloe Dupont", "Thomas Sterling", "Maria Santos", "Dr. Robert Chen",
  "Liam O'Brien", "Sophie Martin", "Hiroshi Tanaka", "Emma Wilson",
  "Abebe Bikila", "Fatima Al-Sayed", "Hans Weber", "Lucia Rossi"
];

const SPECIALIZED_TRAITS: Record<StaffRole, string[]> = {
  veterinarian: ["colic_expert", "bone_specialist", "fertility_boost", "calm_demeanor"],
  farrier: ["mud_expert", "turf_specialist", "synthetic_pro", "durability_focus"],
  nutritionist: ["stamina_optimizer", "weight_manager", "recovery_plus", "growth_agent"],
  groom: ["show_prep", "temperament_calm", "shine_specialist", "vibe_check"]
};

/**
 * Generate a random staff member
 */
export function generateStaffMember(rng: Rng, role?: StaffRole, tier?: StaffTier): StaffMember {
  const chosenRole = role || rng.pick(['veterinarian', 'farrier', 'nutritionist', 'groom']) as StaffRole;
  
  // Weights for tiers: 60% budget, 30% mid, 10% elite
  const tierRoll = rng.next();
  const chosenTier = tier || (tierRoll < 0.6 ? 'budget' : tierRoll < 0.9 ? 'mid' : 'elite') as StaffTier;
  
  const config = STAFF_CONFIG[chosenRole][chosenTier];
  const name = rng.pick(STAFF_NAMES);
  
  // Traits based on tier
  const traits: string[] = [];
  const traitCount = chosenTier === 'elite' ? 2 : chosenTier === 'mid' ? 1 : 0;
  const availableTraits = SPECIALIZED_TRAITS[chosenRole];
  
  for (let i = 0; i < traitCount; i++) {
    const trait = rng.pick(availableTraits);
    if (!traits.includes(trait)) traits.push(trait);
  }

  return {
    id: generateUUID(),
    name,
    role: chosenRole,
    tier: chosenTier,
    salary: config.salary,
    bonusValue: config.bonus,
    traits,
    fame: chosenTier === 'elite' ? 80 + rng.int(0, 20) : chosenTier === 'mid' ? 40 + rng.int(0, 40) : rng.int(0, 40),
  };
}

/**
 * Generate a pool of staff available for hire
 */
export function generateStaffPool(rng: Rng, count: number = 8): StaffMember[] {
  const pool: StaffMember[] = [];
  for (let i = 0; i < count; i++) {
    pool.push(generateStaffMember(rng));
  }
  return pool;
}
