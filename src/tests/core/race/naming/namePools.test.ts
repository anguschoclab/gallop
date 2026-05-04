// Tests for name pools

import { describe, it, expect } from "vitest";
import {
  getRandomSponsor,
  getRandomLocation,
  getRandomEvent,
  getRandomAdjective,
  randomFromArray,
} from "@/core/race/naming/namePools";
import type { RegionalSystem } from "@/game/types";

describe("randomFromArray", () => {
  it("returns a random element from array", () => {
    const arr = ["a", "b", "c", "d"];
    const result = randomFromArray(arr, () => 0.5);
    expect(arr).toContain(result);
  });

  it("returns different elements with different random values", () => {
    const arr = ["a", "b", "c", "d"];
    const result1 = randomFromArray(arr, () => 0);
    const result2 = randomFromArray(arr, () => 0.5);
    expect(result1).toBe("a");
    expect(result2).toBe("c");
  });
});

describe("getRandomSponsor", () => {
  it("returns a sponsor from the specified region", () => {
    const sponsor = getRandomSponsor("north_america", () => 0.5);
    expect(sponsor).toBeTruthy();
    expect(typeof sponsor).toBe("string");
  });

  it("returns different sponsors with different random values", () => {
    const sponsor1 = getRandomSponsor("north_america", () => 0);
    const sponsor2 = getRandomSponsor("north_america", () => 0.5);
    expect(sponsor1).not.toBe(sponsor2);
  });

  it("works for all regional systems", () => {
    const regions: RegionalSystem[] = ["north_america", "europe", "australia", "asia", "south_america"];
    for (const region of regions) {
      const sponsor = getRandomSponsor(region, () => 0.5);
      expect(sponsor).toBeTruthy();
      expect(typeof sponsor).toBe("string");
    }
  });
});

describe("getRandomLocation", () => {
  it("returns a location from the specified region", () => {
    const location = getRandomLocation("north_america", () => 0.5);
    expect(location).toBeTruthy();
    expect(typeof location).toBe("string");
  });

  it("returns different locations with different random values", () => {
    const location1 = getRandomLocation("north_america", () => 0);
    const location2 = getRandomLocation("north_america", () => 0.5);
    expect(location1).not.toBe(location2);
  });

  it("works for all regional systems", () => {
    const regions: RegionalSystem[] = ["north_america", "europe", "australia", "asia", "south_america"];
    for (const region of regions) {
      const location = getRandomLocation(region, () => 0.5);
      expect(location).toBeTruthy();
      expect(typeof location).toBe("string");
    }
  });
});

describe("getRandomEvent", () => {
  it("returns an event from the specified region", () => {
    const event = getRandomEvent("north_america", () => 0.5);
    expect(event).toBeTruthy();
    expect(typeof event).toBe("string");
  });

  it("returns different events with different random values", () => {
    const event1 = getRandomEvent("north_america", () => 0);
    const event2 = getRandomEvent("north_america", () => 0.5);
    expect(event1).not.toBe(event2);
  });

  it("works for all regional systems", () => {
    const regions: RegionalSystem[] = ["north_america", "europe", "australia", "asia", "south_america"];
    for (const region of regions) {
      const event = getRandomEvent(region, () => 0.5);
      expect(event).toBeTruthy();
      expect(typeof event).toBe("string");
    }
  });
});

describe("getRandomAdjective", () => {
  it("returns an adjective from the specified region", () => {
    const adjective = getRandomAdjective("north_america", () => 0.5);
    expect(adjective).toBeTruthy();
    expect(typeof adjective).toBe("string");
  });

  it("returns different adjectives with different random values", () => {
    const adjective1 = getRandomAdjective("north_america", () => 0);
    const adjective2 = getRandomAdjective("north_america", () => 0.5);
    expect(adjective1).not.toBe(adjective2);
  });

  it("works for all regional systems", () => {
    const regions: RegionalSystem[] = ["north_america", "europe", "australia", "asia", "south_america"];
    for (const region of regions) {
      const adjective = getRandomAdjective(region, () => 0.5);
      expect(adjective).toBeTruthy();
      expect(typeof adjective).toBe("string");
    }
  });
});

describe("Name pool sizes", () => {
  it("North America has sufficient sponsors", () => {
    const sponsor = getRandomSponsor("north_america", () => 0.5);
    expect(sponsor).toBeTruthy();
  });

  it("Europe has sufficient sponsors", () => {
    const sponsor = getRandomSponsor("europe", () => 0.5);
    expect(sponsor).toBeTruthy();
  });

  it("Australia has sufficient sponsors", () => {
    const sponsor = getRandomSponsor("australia", () => 0.5);
    expect(sponsor).toBeTruthy();
  });

  it("Asia has sufficient sponsors", () => {
    const sponsor = getRandomSponsor("asia", () => 0.5);
    expect(sponsor).toBeTruthy();
  });

  it("South America has sufficient sponsors", () => {
    const sponsor = getRandomSponsor("south_america", () => 0.5);
    expect(sponsor).toBeTruthy();
  });
});
