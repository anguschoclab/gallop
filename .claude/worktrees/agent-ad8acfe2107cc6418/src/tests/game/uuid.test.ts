import { describe, it, expect } from "vitest";
import { generateUUID, generateShortId, isValidUUID } from "@/game/uuid";

describe("generateUUID", () => {
  it("output passes isValidUUID", () => {
    expect(isValidUUID(generateUUID())).toBe(true);
  });

  it("two calls produce different values", () => {
    expect(generateUUID()).not.toBe(generateUUID());
  });

  it("has correct UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)", () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe("generateShortId", () => {
  it("returns an 8-character string", () => {
    expect(generateShortId()).toHaveLength(8);
  });

  it("contains only alphanumeric characters", () => {
    expect(generateShortId()).toMatch(/^[a-z0-9]{8}$/);
  });

  it("two calls produce different values (probabilistic)", () => {
    const a = generateShortId();
    const b = generateShortId();
    // This could theoretically fail (1 in 36^8 chance) but is safe in practice
    expect(a).not.toBe(b);
  });
});

describe("isValidUUID", () => {
  it("valid v4 UUID → true", () => {
    expect(isValidUUID("550e8400-e29b-4fd4-a716-446655440000")).toBe(true);
    expect(isValidUUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")).toBe(true);
  });

  it("not a UUID → false", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
  });

  it("empty string → false", () => {
    expect(isValidUUID("")).toBe(false);
  });

  it("generated UUID is valid", () => {
    for (let i = 0; i < 10; i++) {
      expect(isValidUUID(generateUUID())).toBe(true);
    }
  });

  it("UUID with wrong version digit → false", () => {
    expect(isValidUUID("550e8400-e29b-3fd4-a716-446655440000")).toBe(false); // v3
  });
});
