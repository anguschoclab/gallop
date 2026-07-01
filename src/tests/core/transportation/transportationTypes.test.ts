import { describe, it, expect, vi } from "vitest";
import {
  getTransportModeForDistance,
  calculateTransportCost,
  calculateTransportDuration,
  createTransportRequest,
  formatTransportMode,
  TRANSPORT_CONFIGS,
  type TransportMode,
} from "@/core/transportation/transportationTypes";

vi.mock("@/core/uuid", () => ({
  generateUUID: () => "test-uuid-id",
}));

describe("getTransportModeForDistance", () => {
  it("returns road for distance 0", () => {
    expect(getTransportModeForDistance(0)).toBe("road");
  });

  it("returns road for distance 1", () => {
    expect(getTransportModeForDistance(1)).toBe("road");
  });

  it("returns road for distance 49", () => {
    expect(getTransportModeForDistance(49)).toBe("road");
  });

  it("returns rail for distance 50 (boundary)", () => {
    expect(getTransportModeForDistance(50)).toBe("rail");
  });

  it("returns rail for distance 51", () => {
    expect(getTransportModeForDistance(51)).toBe("rail");
  });

  it("returns rail for distance 199", () => {
    expect(getTransportModeForDistance(199)).toBe("rail");
  });

  it("returns air for distance 200 (air takes priority over rail)", () => {
    expect(getTransportModeForDistance(200)).toBe("air");
  });

  it("returns air for distance 201", () => {
    expect(getTransportModeForDistance(201)).toBe("air");
  });

  it("returns air for distance 1000 (within both air and rail range)", () => {
    expect(getTransportModeForDistance(1000)).toBe("air");
  });

  it("returns air for distance 2000 (boundary)", () => {
    expect(getTransportModeForDistance(2000)).toBe("air");
  });

  it("returns air for distance 2001", () => {
    expect(getTransportModeForDistance(2001)).toBe("air");
  });

  it("returns air for distance 5000 (boundary)", () => {
    expect(getTransportModeForDistance(5000)).toBe("air");
  });

  it("returns road for distance 5001", () => {
    expect(getTransportModeForDistance(5001)).toBe("road");
  });

  it("returns road for distance 10000", () => {
    expect(getTransportModeForDistance(10000)).toBe("road");
  });

  it("returns road for negative distance", () => {
    expect(getTransportModeForDistance(-100)).toBe("road");
  });
});

describe("calculateTransportCost", () => {
  it("road: 100 miles * 0.5 * 1 horse = 50", () => {
    expect(calculateTransportCost(100, "road")).toBe(50);
  });

  it("air: 1000 miles * 2.0 * 1 horse = 2000", () => {
    expect(calculateTransportCost(1000, "air")).toBe(2000);
  });

  it("rail: 500 miles * 0.3 * 1 horse = 150", () => {
    expect(calculateTransportCost(500, "rail")).toBe(150);
  });

  it("horseCount multiplier: 100 miles road * 0.5 * 3 horses = 150", () => {
    expect(calculateTransportCost(100, "road", 3)).toBe(150);
  });

  it("rounds to nearest integer: 123 miles road * 0.5 = 61.5 -> 62", () => {
    expect(calculateTransportCost(123, "road")).toBe(62);
  });
});

describe("calculateTransportDuration", () => {
  it("road: 200 miles / 200 speed = 1 day", () => {
    expect(calculateTransportDuration(200, "road")).toBe(1);
  });

  it("road: 201 miles / 200 speed = 2 days (ceiling)", () => {
    expect(calculateTransportDuration(201, "road")).toBe(2);
  });

  it("air: 2000 miles / 2000 speed = 1 day", () => {
    expect(calculateTransportDuration(2000, "air")).toBe(1);
  });

  it("air: 2001 miles / 2000 speed = 2 days (ceiling)", () => {
    expect(calculateTransportDuration(2001, "air")).toBe(2);
  });

  it("rail: 400 miles / 400 speed = 1 day", () => {
    expect(calculateTransportDuration(400, "rail")).toBe(1);
  });

  it("rail: 401 miles / 400 speed = 2 days (ceiling)", () => {
    expect(calculateTransportDuration(401, "rail")).toBe(2);
  });
});

describe("createTransportRequest", () => {
  it("auto-selects mode based on distance (no mode override)", () => {
    const req = createTransportRequest("h1", "New York", "Los Angeles", 1000, 5);
    expect(req.mode).toBe("air");
  });

  it("uses provided mode override", () => {
    const req = createTransportRequest("h1", "New York", "Los Angeles", 1000, 5, "rail");
    expect(req.mode).toBe("rail");
  });

  it("calculates cost and duration correctly", () => {
    const req = createTransportRequest("h1", "A", "B", 100, 5, "road");
    expect(req.cost).toBe(50);
    expect(req.duration).toBe(1);
  });

  it("sets arrivalDay = startDay + duration, status = idle", () => {
    const req = createTransportRequest("h1", "A", "B", 500, 10, "rail");
    expect(req.arrivalDay).toBe(10 + req.duration);
    expect(req.status).toBe("idle");
    expect(req.startDay).toBe(10);
    expect(req.horseId).toBe("h1");
    expect(req.fromLocation).toBe("A");
    expect(req.toLocation).toBe("B");
    expect(req.id).toBe("test-uuid-id");
  });
});

describe("formatTransportMode", () => {
  it("formats road", () => {
    expect(formatTransportMode("road")).toBe("Road Transport");
  });

  it("formats air", () => {
    expect(formatTransportMode("air")).toBe("Air Charter");
  });

  it("formats rail", () => {
    expect(formatTransportMode("rail")).toBe("Rail Transport");
  });
});

describe("TRANSPORT_CONFIGS", () => {
  it("has all 3 modes with correct structure", () => {
    const modes: TransportMode[] = ["road", "air", "rail"];
    for (const mode of modes) {
      const config = TRANSPORT_CONFIGS[mode];
      expect(config).toBeDefined();
      expect(config.mode).toBe(mode);
      expect(typeof config.baseCostPerMile).toBe("number");
      expect(typeof config.speed).toBe("number");
      expect(typeof config.capacity).toBe("number");
      expect(typeof config.minDistance).toBe("number");
      expect(typeof config.maxDistance).toBe("number");
    }
  });
});
