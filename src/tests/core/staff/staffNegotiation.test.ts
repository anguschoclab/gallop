import { describe, it, expect } from "vitest";
import { evaluateOffer, FLOOR_BY_TIER, PATIENCE_BY_TIER } from "@/core/staff/staffNegotiation";
import type { StaffMember } from "@/core/staff/staffTypes";

function makeStaff(tier: "budget" | "mid" | "elite" = "mid"): StaffMember {
  return {
    id: "staff-1",
    name: "Test Staff",
    role: "trainer",
    tier,
    salary: 5000,
    bonusValue: 0.1,
    traits: [],
    fame: 50,
  };
}

describe("evaluateOffer", () => {
  it("accepts when offer >= asking", () => {
    const staff = makeStaff("mid");
    const result = evaluateOffer(staff, 5000, 5000, 0);
    expect(result.outcome).toBe("accept");
  });

  it("accepts when offer > asking", () => {
    const staff = makeStaff("mid");
    const result = evaluateOffer(staff, 5000, 6000, 0);
    expect(result.outcome).toBe("accept");
  });

  it("walks away when insult offer (below floor)", () => {
    const staff = makeStaff("mid");
    const floor = FLOOR_BY_TIER.mid; // 0.8
    const insultOffer = Math.floor(5000 * floor) - 100;
    const result = evaluateOffer(staff, 5000, insultOffer, 0);
    expect(result.outcome).toBe("walkaway");
  });

  it("walks away when patience exhausted", () => {
    const staff = makeStaff("mid");
    const patience = PATIENCE_BY_TIER.mid; // 1
    const result = evaluateOffer(staff, 5000, 4900, patience);
    expect(result.outcome).toBe("walkaway");
  });

  it("counter offer is between 5% and 15% bump", () => {
    const staff = makeStaff("budget"); // patience=2, floor=0.7
    const asking = 5000;
    const offer = 4000; // Above floor (0.7 * 5000 = 3500)
    const result = evaluateOffer(staff, asking, offer, 0);
    expect(result.outcome).toBe("counter");
    expect(result.counterSalary).toBeDefined();
    expect(result.counterSalary!).toBeGreaterThan(offer);
    // Counter should be between offer*1.05 and offer*1.15 (capped at asking)
    const minCounter = Math.round(offer * 1.05);
    const maxCounter = Math.round(offer * 1.15);
    expect(result.counterSalary!).toBeGreaterThanOrEqual(minCounter);
    expect(result.counterSalary!).toBeLessThanOrEqual(Math.min(maxCounter, asking));
  });

  it("counter is capped at asking salary", () => {
    const staff = makeStaff("budget");
    const asking = 4200;
    const offer = 4100; // Close to asking, counter bump would exceed asking
    const result = evaluateOffer(staff, asking, offer, 0);
    expect(result.outcome).toBe("counter");
    expect(result.counterSalary!).toBeLessThanOrEqual(asking);
  });

  it("elite staff walks away immediately on any offer below asking (patience=0)", () => {
    const staff = makeStaff("elite"); // patience=0
    const result = evaluateOffer(staff, 5000, 4999, 0);
    expect(result.outcome).toBe("walkaway");
  });

  it("budget staff has more patience for counter offers", () => {
    const staff = makeStaff("budget"); // patience=2, floor=0.7
    const asking = 5000;
    const offer = 4000; // Above floor
    // First round should counter
    const r1 = evaluateOffer(staff, asking, offer, 0);
    expect(r1.outcome).toBe("counter");
    // Second round should still counter (patience=2)
    const r2 = evaluateOffer(staff, asking, offer, 1);
    expect(r2.outcome).toBe("counter");
    // Third round should walk away (patience exhausted)
    const r3 = evaluateOffer(staff, asking, offer, 2);
    expect(r3.outcome).toBe("walkaway");
  });
});
