import { describe, it, expect } from "vitest";
import { getRegion, isValidRegion } from "@/core/calendar/regions";

describe("regions", () => {
  it("getRegion returns region config", () => {
    expect(getRegion("usa")).toBeDefined();
    expect(getRegion("invalid")).toBeUndefined();
  });
  it("isValidRegion checks validity", () => {
    expect(isValidRegion("usa")).toBe(true);
    expect(isValidRegion("invalid")).toBe(false);
  });
});
