import { describe, it, expect, afterEach } from "vitest";
import {
  GRADED_RACES,
  getRaceCountry,
  getTrackCountry,
  getTrackContinent,
  getCountry,
  doy,
  getDefaultFieldSize,
  getCountryRegion,
  validateNoDuplicateRaces,
  type GradedRace,
  type Continent,
} from "@/data/gradedRaces";
import { TRACK_BY_ID, TRACK_BY_NAME } from "@/data/tracks";

let originalSnapshot: GradedRace[] | undefined;

afterEach(() => {
  if (originalSnapshot) {
    GRADED_RACES.length = 0;
    GRADED_RACES.push(...originalSnapshot);
    originalSnapshot = undefined;
  }
});

function snapshotRaces() {
  originalSnapshot = [...GRADED_RACES];
}

describe("validateNoDuplicateRaces", () => {
  it("real GRADED_RACES passes — no throw", () => {
    expect(() => validateNoDuplicateRaces()).not.toThrow();
  });

  it("all keys unique — Set size equals array length", () => {
    const keys = GRADED_RACES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("duplicate key throws with correct message", () => {
    snapshotRaces();
    const dup = { ...GRADED_RACES[0] };
    GRADED_RACES.push(dup);
    expect(() => validateNoDuplicateRaces()).toThrow("Duplicate race keys found");
  });

  it("error message includes key name and index", () => {
    snapshotRaces();
    const dup = { ...GRADED_RACES[0] };
    GRADED_RACES.push(dup);
    try {
      validateNoDuplicateRaces();
      expect.fail("should have thrown");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain(dup.key);
      expect(msg).toContain(String(GRADED_RACES.length - 1));
    }
  });

  it("multiple duplicates all reported", () => {
    snapshotRaces();
    const dup1 = { ...GRADED_RACES[0] };
    const dup2 = { ...GRADED_RACES[1] };
    GRADED_RACES.push(dup1, dup2);
    try {
      validateNoDuplicateRaces();
      expect.fail("should have thrown");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain(dup1.key);
      expect(msg).toContain(dup2.key);
    }
  });

  it("empty array doesn't throw", () => {
    snapshotRaces();
    GRADED_RACES.length = 0;
    expect(() => validateNoDuplicateRaces()).not.toThrow();
  });

  it("single element doesn't throw", () => {
    snapshotRaces();
    const single = GRADED_RACES[0];
    GRADED_RACES.length = 0;
    GRADED_RACES.push(single);
    expect(() => validateNoDuplicateRaces()).not.toThrow();
  });
});

describe("GRADED_RACES data integrity", () => {
  it("array is non-empty", () => {
    expect(GRADED_RACES.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const r of GRADED_RACES) {
      expect(r.uuid).toBeTruthy();
      expect(r.key).toBeTruthy();
      expect(r.name).toBeTruthy();
      expect(r.track).toBeTruthy();
      expect(r.trackId).toBeTruthy();
      expect(r.grade).toBeTruthy();
      expect(r.distance).toBeDefined();
      expect(r.surface).toBeDefined();
      expect(r.purse).toBeDefined();
      expect(r.dayOfYear).toBeDefined();
    }
  });

  it("all UUIDs are unique", () => {
    const uuids = GRADED_RACES.map((r) => r.uuid);
    expect(new Set(uuids).size).toBe(uuids.length);
  });

  it("all keys are non-empty strings", () => {
    for (const r of GRADED_RACES) {
      expect(r.key.length).toBeGreaterThan(0);
    }
  });

  it("all dayOfYear in [1, 365]", () => {
    for (const r of GRADED_RACES) {
      expect(r.dayOfYear).toBeGreaterThanOrEqual(1);
      expect(r.dayOfYear).toBeLessThanOrEqual(365);
    }
  });

  it("all distance positive", () => {
    for (const r of GRADED_RACES) {
      expect(r.distance).toBeGreaterThan(0);
    }
  });

  it("all purse positive", () => {
    for (const r of GRADED_RACES) {
      expect(r.purse).toBeGreaterThan(0);
    }
  });

  it("all grade valid", () => {
    const valid = ["G1", "G2", "G3"];
    for (const r of GRADED_RACES) {
      expect(valid).toContain(r.grade);
    }
  });

  it("all surface valid", () => {
    const valid = ["Turf", "Dirt", "Synthetic"];
    for (const r of GRADED_RACES) {
      expect(valid).toContain(r.surface);
    }
  });

  it("all fieldSize assigned and positive", () => {
    for (const r of GRADED_RACES) {
      expect(r.fieldSize).toBeDefined();
      expect(r.fieldSize!).toBeGreaterThan(0);
    }
  });

  it("all trackId values exist in TRACK_BY_ID", () => {
    for (const r of GRADED_RACES) {
      expect(TRACK_BY_ID[r.trackId]).toBeDefined();
    }
  });

  it("all track names exist in TRACK_BY_NAME", () => {
    for (const r of GRADED_RACES) {
      expect(TRACK_BY_NAME[r.track]).toBeDefined();
    }
  });
});

describe("doy", () => {
  it("Jan 1 → day 1", () => expect(doy(1, 1)).toBe(1));
  it("Dec 31 → day 365", () => expect(doy(12, 31)).toBe(365));
  it("Mar 1 → day 60", () => expect(doy(3, 1)).toBe(60));
  it("Feb 28 → day 59", () => expect(doy(2, 28)).toBe(59));
  it("Jul 6 → day 187", () => expect(doy(7, 6)).toBe(187));
});

describe("getCountry", () => {
  it("Woodbine → Canada", () => expect(getCountry("Woodbine")).toBe("Canada"));
  it("Meydan → UAE", () => expect(getCountry("Meydan")).toBe("UAE"));
  it("Churchill Downs → USA", () => expect(getCountry("Churchill Downs")).toBe("USA"));
  it("Tokyo → Japan", () => expect(getCountry("Tokyo")).toBe("Japan"));
  it("Sha Tin → Hong Kong", () => expect(getCountry("Sha Tin")).toBe("Hong Kong"));
  it("unknown track → Other", () => expect(getCountry("Nonexistent")).toBe("Other"));

  it("all tracks in GRADED_RACES resolve to non-Other", () => {
    for (const r of GRADED_RACES) {
      expect(getCountry(r.track)).not.toBe("Other");
    }
  });
});

describe("getRaceCountry", () => {
  it("race with explicit country returns that country", () => {
    const race = { ...GRADED_RACES[0], country: "Japan" } as GradedRace;
    expect(getRaceCountry(race)).toBe("Japan");
  });

  it("race without country falls back to getCountry(track)", () => {
    const race = { ...GRADED_RACES[0], country: undefined } as GradedRace;
    expect(getRaceCountry(race)).toBe(getCountry(race.track));
  });

  it("all GRADED_RACES entries resolve to non-Other country", () => {
    for (const r of GRADED_RACES) {
      expect(getRaceCountry(r)).not.toBe("Other");
    }
  });
});

describe("getTrackCountry", () => {
  it("known track → correct country", () => expect(getTrackCountry("Ascot")).toBe("Great Britain"));
  it("unknown track → Other", () => expect(getTrackCountry("Nowhere")).toBe("Other"));
});

describe("getTrackContinent", () => {
  it("North American track → north_america", () =>
    expect(getTrackContinent("Churchill Downs")).toBe("north_america"));
  it("European track → europe", () => expect(getTrackContinent("Ascot")).toBe("europe"));
  it("Asian track → asia_pacific", () => expect(getTrackContinent("Tokyo")).toBe("asia_pacific"));
  it("South American track → south_america", () =>
    expect(getTrackContinent("Hipódromo de San Isidro")).toBe("south_america"));
  it("UAE track → europe (per COUNTRY_TO_CONTINENT mapping)", () =>
    expect(getTrackContinent("Meydan")).toBe("europe"));
  it("unknown track → europe (default)", () =>
    expect(getTrackContinent("Nowhere")).toBe("europe"));

  it("all tracks in GRADED_RACES map to a known continent", () => {
    const valid: Continent[] = ["north_america", "europe", "asia_pacific", "south_america"];
    for (const r of GRADED_RACES) {
      expect(valid).toContain(getTrackContinent(r.track));
    }
  });
});

describe("getDefaultFieldSize", () => {
  it("USA G1 → 13, G2 → 10, G3 → 8", () => {
    expect(getDefaultFieldSize("G1", "USA")).toBe(13);
    expect(getDefaultFieldSize("G2", "USA")).toBe(10);
    expect(getDefaultFieldSize("G3", "USA")).toBe(8);
  });

  it("Japan G1 → 17, G2 → 13, G3 → 11", () => {
    expect(getDefaultFieldSize("G1", "Japan")).toBe(17);
    expect(getDefaultFieldSize("G2", "Japan")).toBe(13);
    expect(getDefaultFieldSize("G3", "Japan")).toBe(11);
  });

  it("UAE G1 → 11, G2 → 9, G3 → 7", () => {
    expect(getDefaultFieldSize("G1", "UAE")).toBe(11);
    expect(getDefaultFieldSize("G2", "UAE")).toBe(9);
    expect(getDefaultFieldSize("G3", "UAE")).toBe(7);
  });

  it("Hong Kong G1 → 13, G2 → 11, G3 → 9", () => {
    expect(getDefaultFieldSize("G1", "Hong Kong")).toBe(13);
    expect(getDefaultFieldSize("G2", "Hong Kong")).toBe(11);
    expect(getDefaultFieldSize("G3", "Hong Kong")).toBe(9);
  });

  it("Argentina G1 → 13, G2 → 9, G3 → 7", () => {
    expect(getDefaultFieldSize("G1", "Argentina")).toBe(13);
    expect(getDefaultFieldSize("G2", "Argentina")).toBe(9);
    expect(getDefaultFieldSize("G3", "Argentina")).toBe(7);
  });

  it("unknown country → defaults to Europe matrix (G1 → 15)", () => {
    expect(getDefaultFieldSize("G1", "Unknown")).toBe(15);
  });

  it("all GRADED_RACES entries have positive fieldSize", () => {
    for (const r of GRADED_RACES) {
      expect(r.fieldSize).toBeGreaterThan(0);
    }
  });
});

describe("getCountryRegion", () => {
  it("USA → north_america", () => expect(getCountryRegion("USA")).toBe("north_america"));
  it("Japan → japan", () => expect(getCountryRegion("Japan")).toBe("japan"));
  it("UAE → uae", () => expect(getCountryRegion("UAE")).toBe("uae"));
  it("Hong Kong → hong_kong", () => expect(getCountryRegion("Hong Kong")).toBe("hong_kong"));
  it("Australia → asia_pacific", () => expect(getCountryRegion("Australia")).toBe("asia_pacific"));
  it("Argentina → south_america", () =>
    expect(getCountryRegion("Argentina")).toBe("south_america"));
  it("unknown country → europe (default)", () =>
    expect(getCountryRegion("Unknown")).toBe("europe"));
});
