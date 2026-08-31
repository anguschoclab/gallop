/**
 * uuidProvider.test.ts
 *
 * Tests for the UUIDProvider class.
 * Verifies pool pre-generation, auto-expansion, determinism preservation,
 * and fallback behavior.
 */

import { describe, it, expect } from "vitest";
import { UUIDProvider } from "@/core/uuidProvider";
import { generateUUID } from "@/core/uuid";
import { createRng } from "@/core/common/rng";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("UUIDProvider with rng", () => {
  it("returns UUIDs from pre-generated pool", () => {
    const rng = createRng("provider-basic");
    const provider = new UUIDProvider(rng, 10);
    const uuids: string[] = [];
    for (let i = 0; i < 10; i++) {
      uuids.push(provider.next());
    }
    expect(uuids).toHaveLength(10);
    for (const uuid of uuids) {
      expect(UUID_REGEX.test(uuid)).toBe(true);
    }
  });

  it("remaining decrements correctly", () => {
    const rng = createRng("provider-remaining");
    const provider = new UUIDProvider(rng, 20);
    expect(provider.remaining).toBe(20);
    provider.next();
    expect(provider.remaining).toBe(19);
    provider.next();
    expect(provider.remaining).toBe(18);
  });

  it("auto-expands when pool exhausted", () => {
    const rng = createRng("provider-expand");
    const provider = new UUIDProvider(rng, 5);
    // Exhaust the initial pool
    for (let i = 0; i < 5; i++) {
      provider.next();
    }
    expect(provider.remaining).toBe(0);
    // Auto-expand should happen transparently
    const uuid = provider.next();
    expect(UUID_REGEX.test(uuid)).toBe(true);
    expect(provider.remaining).toBeGreaterThan(0);
  });

  it("auto-expansion produces valid and unique UUIDs", () => {
    const rng = createRng("provider-expand-unique");
    const provider = new UUIDProvider(rng, 3);
    const uuids = new Set<string>();
    // Request far more than initial pool
    for (let i = 0; i < 100; i++) {
      const uuid = provider.next();
      expect(UUID_REGEX.test(uuid)).toBe(true);
      expect(uuids.has(uuid)).toBe(false);
      uuids.add(uuid);
    }
    expect(uuids.size).toBe(100);
  });

  it("auto-expansion preserves determinism — same seed produces same UUIDs regardless of pool size", () => {
    const count = 150;
    const rng1 = createRng("determinism-pool");
    const rng2 = createRng("determinism-pool");

    const providerSmall = new UUIDProvider(rng1, 128);
    const providerLarge = new UUIDProvider(rng2, 256);

    for (let i = 0; i < count; i++) {
      expect(providerSmall.next()).toBe(providerLarge.next());
    }
  });

  it("produces same UUIDs as sequential generateUUID(rng) calls", () => {
    const count = 50;
    const rngProvider = createRng("provider-equivalence");
    const rngSeq = createRng("provider-equivalence");

    const provider = new UUIDProvider(rngProvider, count);
    for (let i = 0; i < count; i++) {
      expect(provider.next()).toBe(generateUUID(rngSeq));
    }
  });
});

describe("UUIDProvider without rng (crypto fallback)", () => {
  it("returns valid UUIDs", () => {
    const provider = new UUIDProvider(undefined, 10);
    for (let i = 0; i < 10; i++) {
      const uuid = provider.next();
      expect(UUID_REGEX.test(uuid)).toBe(true);
    }
  });

  it("auto-expands with valid UUIDs when exhausted", () => {
    const provider = new UUIDProvider(undefined, 2);
    for (let i = 0; i < 2; i++) {
      provider.next();
    }
    const uuid = provider.next();
    expect(UUID_REGEX.test(uuid)).toBe(true);
  });
});
