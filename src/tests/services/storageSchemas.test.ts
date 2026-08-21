import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import {
  safeParseJson,
  gameStateSchema,
  wizardStateSchema,
  raceFiltersSchema,
  saveSlotMetadataArraySchema,
  bucketPayloadSchema,
  raceProgressSchema,
  bookmarkArraySchema,
  analyticsEventArraySchema,
  dismissedInquiriesSchema,
} from "@/services/storage/schemas";
import { createDefaultGameState } from "@/game/store/state";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeValidGameState() {
  return JSON.parse(JSON.stringify(createDefaultGameState()));
}

function makeValidWizardState() {
  return {
    step: 1,
    stableName: "Test Stable",
    ownerName: "Test Owner",
    silk: { pattern: "solid", primary: "#FF0000", secondary: "#0000FF", cap: "#00FF00" },
    backstoryId: "backstory-1",
    worldSize: "medium",
  };
}

function makeValidMetadata() {
  return [
    {
      id: "slot1",
      name: "Test Save",
      timestamp: 1234567890,
      gameDay: 42,
      stableName: "Test Stable",
      cash: 100000,
      isAutoSave: false,
    },
  ];
}

// ── safeParseJson helper ──────────────────────────────────────────────────────

describe("safeParseJson", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns parsed data for valid JSON + valid schema", () => {
    const result = safeParseJson('{"a":1}', zSimpleObj);
    expect(result).toEqual({ a: 1 });
  });

  it("returns null for invalid JSON syntax", () => {
    const result = safeParseJson("{ invalid }", zSimpleObj);
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("returns null for schema validation failure", () => {
    const result = safeParseJson('{"a":"not-a-number"}', zSimpleObj);
    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("returns null for empty string", () => {
    const result = safeParseJson("", zSimpleObj);
    expect(result).toBeNull();
  });

  it("does not propagate __proto__ from prototype pollution payload", () => {
    const result = safeParseJson('{"__proto__":{"polluted":true}}', zSimpleObjPassthrough);
    expect(result).not.toBeNull();
    expect(({} as any).polluted).toBeUndefined();
  });
});

// Inline schemas for safeParseJson tests
const zSimpleObj = z.object({ a: z.number() });
const zSimpleObjPassthrough = z.object({}).passthrough();

// ── gameStateSchema ───────────────────────────────────────────────────────────

describe("gameStateSchema", () => {
  it("accepts a valid createDefaultGameState()", () => {
    const state = makeValidGameState();
    const result = gameStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("rejects missing day", () => {
    const state = makeValidGameState();
    delete state.day;
    expect(gameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects day as string", () => {
    const state = makeValidGameState();
    state.day = "not a number" as any;
    expect(gameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects missing horses", () => {
    const state = makeValidGameState() as any;
    delete state.horses;
    expect(gameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects horses as array instead of record", () => {
    const state = makeValidGameState();
    state.horses = [] as any;
    expect(gameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects missing races", () => {
    const state = makeValidGameState() as any;
    delete state.races;
    expect(gameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects missing npcStables", () => {
    const state = makeValidGameState() as any;
    delete state.npcStables;
    expect(gameStateSchema.safeParse(state).success).toBe(false);
  });

  it("rejects missing usedHorseNames", () => {
    const state = makeValidGameState() as any;
    delete state.usedHorseNames;
    expect(gameStateSchema.safeParse(state).success).toBe(false);
  });

  it("preserves extra unknown fields (passthrough)", () => {
    const state = makeValidGameState();
    (state as any).customField = "hello";
    const result = gameStateSchema.safeParse(state);
    expect(result.success).toBe(true);
    expect((result.data as any).customField).toBe("hello");
  });

  it("accepts when optional fields are absent", () => {
    const state = makeValidGameState();
    delete (state as any).auctions;
    delete (state as any).jockeys;
    const result = gameStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("preserves storeVersion field (passthrough)", () => {
    const state = makeValidGameState();
    (state as any).storeVersion = 42;
    const result = gameStateSchema.safeParse(state);
    expect(result.success).toBe(true);
    expect((result.data as any).storeVersion).toBe(42);
  });
});

// ── wizardStateSchema ─────────────────────────────────────────────────────────

describe("wizardStateSchema", () => {
  it("accepts a valid wizard state", () => {
    expect(wizardStateSchema.safeParse(makeValidWizardState()).success).toBe(true);
  });

  it("rejects missing silk", () => {
    const w = makeValidWizardState() as any;
    delete w.silk;
    expect(wizardStateSchema.safeParse(w).success).toBe(false);
  });

  it("rejects silk missing pattern", () => {
    const w = makeValidWizardState() as any;
    delete w.silk.pattern;
    expect(wizardStateSchema.safeParse(w).success).toBe(false);
  });

  it("rejects step as string", () => {
    const w = makeValidWizardState();
    (w as any).step = "one";
    expect(wizardStateSchema.safeParse(w).success).toBe(false);
  });

  it("accepts worldSize field", () => {
    const w = makeValidWizardState();
    expect(wizardStateSchema.safeParse(w).success).toBe(true);
    expect(w.worldSize).toBe("medium");
  });

  it("rejects invalid worldSize values", () => {
    const w = makeValidWizardState();
    (w as any).worldSize = "huge";
    expect(wizardStateSchema.safeParse(w).success).toBe(false);
  });
});

// ── raceFiltersSchema ─────────────────────────────────────────────────────────

describe("raceFiltersSchema", () => {
  it("accepts valid string-to-string record", () => {
    expect(raceFiltersSchema.safeParse({ track: "Churchill", grade: "G1" }).success).toBe(true);
  });

  it("rejects non-string value", () => {
    expect(raceFiltersSchema.safeParse({ track: 123 }).success).toBe(false);
  });

  it("accepts empty object", () => {
    expect(raceFiltersSchema.safeParse({}).success).toBe(true);
  });
});

// ── saveSlotMetadataArraySchema ───────────────────────────────────────────────

describe("saveSlotMetadataArraySchema", () => {
  it("accepts valid array with one metadata", () => {
    expect(saveSlotMetadataArraySchema.safeParse(makeValidMetadata()).success).toBe(true);
  });

  it("rejects isAutoSave as string", () => {
    const m = makeValidMetadata();
    (m[0] as any).isAutoSave = "yes";
    expect(saveSlotMetadataArraySchema.safeParse(m).success).toBe(false);
  });

  it("rejects missing id", () => {
    const m = makeValidMetadata();
    delete (m[0] as any).id;
    expect(saveSlotMetadataArraySchema.safeParse(m).success).toBe(false);
  });

  it("accepts empty array", () => {
    expect(saveSlotMetadataArraySchema.safeParse([]).success).toBe(true);
  });
});

// ── bucketPayloadSchema ───────────────────────────────────────────────────────

describe("bucketPayloadSchema", () => {
  it("accepts valid payload with all buckets", () => {
    const payload = {
      meta: { storeVersion: 1 },
      horses: { playerHorses: {}, npcSummaries: [] },
      races: {},
      npcStables: {},
    };
    expect(bucketPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("accepts payload with only meta (others optional)", () => {
    expect(bucketPayloadSchema.safeParse({ meta: {} }).success).toBe(true);
  });

  it("rejects horses as string", () => {
    expect(bucketPayloadSchema.safeParse({ horses: "bad" }).success).toBe(false);
  });

  it("preserves extra fields (passthrough)", () => {
    const payload = { meta: {}, extraBucket: [1, 2] };
    const result = bucketPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
    expect((result.data as any).extraBucket).toEqual([1, 2]);
  });
});

// ── raceProgressSchema ────────────────────────────────────────────────────────

describe("raceProgressSchema", () => {
  it("accepts valid progress object", () => {
    expect(raceProgressSchema.safeParse({ simTime: 5, paused: false, speed: 2 }).success).toBe(
      true,
    );
  });

  it("rejects simTime as string", () => {
    expect(raceProgressSchema.safeParse({ simTime: "5", paused: false, speed: 2 }).success).toBe(
      false,
    );
  });

  it("rejects missing speed", () => {
    expect(raceProgressSchema.safeParse({ simTime: 5, paused: false }).success).toBe(false);
  });
});

// ── bookmarkArraySchema ───────────────────────────────────────────────────────

describe("bookmarkArraySchema", () => {
  it("accepts valid array", () => {
    const bookmarks = [
      { type: "horse", id: "h1", label: "Horse 1", addedAt: 1000 },
      { type: "jockey", id: "j1", label: "Jockey 1", tags: ["fast"], addedAt: 2000 },
    ];
    expect(bookmarkArraySchema.safeParse(bookmarks).success).toBe(true);
  });

  it("rejects invalid type enum value", () => {
    const bookmarks = [{ type: "invalid", id: "x", label: "X", addedAt: 1 }];
    expect(bookmarkArraySchema.safeParse(bookmarks).success).toBe(false);
  });

  it("rejects missing id", () => {
    const bookmarks = [{ type: "horse", label: "No ID", addedAt: 1 }];
    expect(bookmarkArraySchema.safeParse(bookmarks).success).toBe(false);
  });

  it("accepts empty array", () => {
    expect(bookmarkArraySchema.safeParse([]).success).toBe(true);
  });
});

// ── analyticsEventArraySchema ────────────────────────────────────────────────

describe("analyticsEventArraySchema", () => {
  it("accepts valid array", () => {
    const events = [
      { event: "click", timestamp: 1000 },
      { event: "scroll", properties: { x: 10 }, timestamp: 2000 },
    ];
    expect(analyticsEventArraySchema.safeParse(events).success).toBe(true);
  });

  it("rejects timestamp as string", () => {
    expect(analyticsEventArraySchema.safeParse([{ event: "x", timestamp: "1000" }]).success).toBe(
      false,
    );
  });

  it("accepts empty array", () => {
    expect(analyticsEventArraySchema.safeParse([]).success).toBe(true);
  });
});

// ── dismissedInquiriesSchema ──────────────────────────────────────────────────

describe("dismissedInquiriesSchema", () => {
  it("accepts valid string array", () => {
    expect(dismissedInquiriesSchema.safeParse(["id1", "id2"]).success).toBe(true);
  });

  it("rejects non-string element", () => {
    expect(dismissedInquiriesSchema.safeParse(["id1", 123]).success).toBe(false);
  });

  it("accepts empty array", () => {
    expect(dismissedInquiriesSchema.safeParse([]).success).toBe(true);
  });
});
