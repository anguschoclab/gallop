import { describe, it, expect } from "vitest";
import { createFacility, calculateTotalMaintenance } from "@/domains/facilities/simulation/facilityDefaults";
import { FACILITY_MAINTENANCE_COSTS } from "@/domains/facilities/model/facilityTypes";
import type { PlayerFacilities } from "@/domains/facilities/model/facilityTypes";

describe("Imperial Outpost Facilities (jockey_academy, museum)", () => {
  it("creates jockey_academy facility with maintenance and upgrade costs", () => {
    const academy = createFacility("jockey_academy" as any, "basic", 1);
    expect(academy.type).toBe("jockey_academy");
    expect(academy.level).toBe("basic");
    expect(academy.maintenanceCost).toBeGreaterThan(0);
  });

  it("creates museum facility with maintenance and upgrade costs", () => {
    const museum = createFacility("museum" as any, "basic", 1);
    expect(museum.type).toBe("museum");
    expect(museum.level).toBe("basic");
    expect(museum.maintenanceCost).toBeGreaterThan(0);
  });

  it("includes imperial facilities in calculateTotalMaintenance", () => {
    const facilities: PlayerFacilities = {
      main_track: createFacility("main_track", "basic", 1),
      jockey_academy: createFacility("jockey_academy" as any, "standard", 1),
      museum: createFacility("museum" as any, "standard", 1),
    } as any;

    const total = calculateTotalMaintenance(facilities);
    expect(total).toBe(FACILITY_MAINTENANCE_COSTS.basic + FACILITY_MAINTENANCE_COSTS.standard * 2);
  });
});
