/**
 * uuidBulk.test.ts
 *
 * Tests for generateUUIDBulk function.
 * Critical: verifies that bulk generation produces identical UUIDs to
 * sequential generateUUID calls with the same RNG state (determinism equivalence).
 */

import { describe, it, expect } from "vitest";
import { generateUUID, generateUUIDBulk, isValidUUID } from "@/core/uuid";
import { createRng } from "@/core/common/rng";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("generateUUIDBulk with rng", () => {
  it("returns array of correct length", () => {
    const rng = createRng("bulk-length");
    expect(generateUUIDBulk(rng, 0)).toHaveLength(0);
    expect(generateUUIDBulk(rng, 1)).toHaveLength(1);
    expect(generateUUIDBulk(rng, 10)).toHaveLength(10);
    expect(generateUUIDBulk(rng, 100)).toHaveLength(100);
  });

  it("produces same UUIDs as N sequential generateUUID(rng) calls — determinism equivalence", () => {
    const count = 200;
    const rngBulk = createRng("equivalence-seed");
    const rngSeq = createRng("equivalence-seed");

    const bulk = generateUUIDBulk(rngBulk, count);
    const sequential: string[] = [];
    for (let i = 0; i < count; i++) {
      sequential.push(generateUUID(rngSeq));
    }

    expect(bulk).toEqual(sequential);
  });

  it("all UUIDs are valid v4 format", () => {
    const rng = createRng("bulk-format");
    const uuids = generateUUIDBulk(rng, 500);
    for (const uuid of uuids) {
      expect(UUID_REGEX.test(uuid)).toBe(true);
      expect(isValidUUID(uuid)).toBe(true);
    }
  });

  it("all UUIDs are unique", () => {
    const rng = createRng("bulk-unique");
    const uuids = generateUUIDBulk(rng, 1000);
    const set = new Set(uuids);
    expect(set.size).toBe(1000);
  });

  it("returns empty array for count 0", () => {
    const rng = createRng("bulk-zero");
    expect(generateUUIDBulk(rng, 0)).toEqual([]);
  });
});

describe("generateUUIDBulk without rng (crypto path)", () => {
  it("returns valid UUIDs", () => {
    const uuids = generateUUIDBulk(undefined, 10);
    expect(uuids).toHaveLength(10);
    for (const uuid of uuids) {
      expect(UUID_REGEX.test(uuid)).toBe(true);
    }
  });

  it("returns unique UUIDs", () => {
    const uuids = generateUUIDBulk(undefined, 100);
    const set = new Set(uuids);
    expect(set.size).toBe(100);
  });
});
