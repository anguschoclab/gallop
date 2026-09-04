import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateStaffMember,
  generateStaffPool,
  SPECIALIZED_TRAITS,
} from "@/core/staff/staffGenerator";
import { STAFF_CONFIG } from "@/core/staff/staffConfig";
import type { Rng } from "@/core/common/rng";
import type { StaffRole, StaffTier } from "@/core/staff/staffTypes";

vi.mock("@/core/uuid", () => ({
  generateUUID: vi.fn(() => "mocked-uuid"),
}));

describe("staffGenerator", () => {
  let mockRng: Rng;

  beforeEach(() => {
    mockRng = {
      next: vi.fn().mockReturnValue(0.5), // Mid tier by default (0.6 <= 0.5 < 0.9)
      pick: vi.fn((arr: readonly any[]) => arr[0]), // Always pick the first item for predictability
      int: vi.fn().mockReturnValue(10), // Deterministic int for fame
    } as unknown as Rng;
  });

  describe("generateStaffMember", () => {
    it("should generate a staff member with explicit role and tier", () => {
      const staff = generateStaffMember(mockRng, "veterinarian", "elite");

      expect(staff.id).toBe("mocked-uuid");
      expect(staff.role).toBe("veterinarian");
      expect(staff.tier).toBe("elite");
      expect(staff.name).toBeDefined();
      expect(staff.salary).toBe(STAFF_CONFIG.veterinarian.elite.salary);
      expect(staff.bonusValue).toBe(STAFF_CONFIG.veterinarian.elite.bonus);
      // Elite should have up to 2 traits (mock pick returns first always, so duplicates might be filtered to 1 if we don't mock it to return different ones, but logic says 1 or 2)
      expect(staff.traits.length).toBeGreaterThanOrEqual(1);
      expect(staff.fame).toBe(80 + 10); // 90
    });

    it("should fall back to random role and tier when not provided", () => {
      // RNG next() returns 0.1 -> "budget" tier
      vi.mocked(mockRng.next).mockReturnValue(0.1);
      // RNG pick() returns "veterinarian" for role, "Dr. Sarah Jenkins" for name
      const staff = generateStaffMember(mockRng);

      expect(staff.role).toBe("veterinarian");
      expect(staff.tier).toBe("budget");
      expect(staff.salary).toBe(STAFF_CONFIG.veterinarian.budget.salary);
      expect(staff.traits).toEqual([]); // Budget tier gets 0 traits
      expect(staff.fame).toBe(10); // rng.int(0, 40) -> 10
    });

    it("should assign correct traits for mid tier", () => {
      // RNG next() returns 0.7 -> "mid" tier
      vi.mocked(mockRng.next).mockReturnValue(0.7);
      const staff = generateStaffMember(mockRng, "farrier", "mid");

      expect(staff.traits.length).toBe(1);
      expect(SPECIALIZED_TRAITS.farrier).toContain(staff.traits[0]);
    });

    it("should handle trait duplicate prevention for elite tier", () => {
      // Mock pick to return the exact same trait twice
      let pickCalls = 0;
      vi.mocked(mockRng.pick).mockImplementation((arr: readonly any[]) => {
        pickCalls++;
        if (pickCalls > 1) {
          // When picking traits, always return the first one
          return arr[0];
        }
        return arr[0];
      });

      const staff = generateStaffMember(mockRng, "nutritionist", "elite");

      // Because we mocked it to pick the exact same trait, it should only add 1 trait (duplicates skipped)
      expect(staff.traits.length).toBe(1);
    });
  });

  describe("generateStaffPool", () => {
    it("should generate a pool of 8 staff members by default", () => {
      const pool = generateStaffPool(mockRng);
      expect(pool.length).toBe(8);
      pool.forEach((staff) => {
        expect(staff.id).toBeDefined();
        expect(staff.role).toBeDefined();
      });
    });

    it("should generate a pool of specified count", () => {
      const pool = generateStaffPool(mockRng, 3);
      expect(pool.length).toBe(3);
    });
  });
});
