/**
 * personGenerator.test.ts - Deterministic person identity generation contracts
 */

import { describe, it, expect } from "vitest";
import {
  generatePersonIdentity,
  rerollPersonAppearance,
  getPersonAgeBand,
  getPersonAge,
  getPersonDisplayName,
  PERSON_SCHEMA_VERSION,
  PERSON_ASSET_PACK_VERSION,
  PERSON_ROLES,
} from "@/domains/person/simulation/generator";
import { createStubPersonIdentity } from "@/domains/person/model/fixtures";

const VALID_IDS: Record<string, string[]> = {
  faceBaseId: ["oval", "round", "square", "heart", "long", "angular"],
  hairId: [
    "short-crop",
    "side-part",
    "slick-back",
    "curly-short",
    "wavy-medium",
    "ponytail",
    "bun",
    "braided",
    "buzz",
    "long-wavy",
    "top-knot",
    "afro-texture",
  ],
  eyeId: ["almond", "round", "hooded", "deep-set", "wide"],
  browId: ["thin", "medium", "thick", "bushy", "arched"],
  noseId: ["straight", "broad", "narrow", "button", "strong", "snub"],
  mouthId: ["neutral", "smile", "firm", "wide", "small"],
  earId: ["small", "medium", "large", "close", "protruding"],
  bodyId: ["slim", "medium", "broad", "compact", "tall"],
};

function generate(id: string) {
  return generatePersonIdentity({
    id,
    displayName: `Name ${id}`,
    role: "jockey",
    ageBand: "adult",
  });
}

describe("generatePersonIdentity", () => {
  it("same host id produces identical identity", () => {
    expect(generate("j-1")).toEqual(generate("j-1"));
  });

  it("different host ids produce different appearance DNA", () => {
    expect(generate("j-1").appearance).not.toEqual(generate("j-2").appearance);
  });

  it("identity id equals the host id", () => {
    expect(generate("jockey-42").id).toBe("jockey-42");
  });

  it("appearance carries schema and asset pack versions", () => {
    const a = generate("v").appearance;
    expect(a.schemaVersion).toBe(PERSON_SCHEMA_VERSION);
    expect(a.assetPackVersion).toBe(PERSON_ASSET_PACK_VERSION);
    expect(a.revision).toBe(0);
  });

  it("all generated manifest selections are valid known IDs", () => {
    for (let i = 0; i < 200; i++) {
      const a = generate(`sample-${i}`).appearance;
      for (const [field, ids] of Object.entries(VALID_IDS)) {
        expect(ids).toContain(a[field as keyof typeof a]);
      }
      expect(a.skinToneId).toMatch(/^#/);
      expect(a.hairColorId).toMatch(/^#/);
      expect(a.eyeColorId).toMatch(/^#/);
    }
  });

  it("biography satisfies allowed vocabularies", () => {
    for (let i = 0; i < 100; i++) {
      const p = generate(`bio-${i}`);
      expect(["he/him", "she/her", "they/them"]).toContain(p.biography.pronouns);
      expect(["masculine", "feminine", "neutral"]).toContain(p.biography.presentation);
      expect(p.biography.displayName).toBe(`Name bio-${i}`);
      expect(p.biography.birthYear).toBeLessThan(2026);
    }
  });

  it("display name does not change appearance", () => {
    const a = generatePersonIdentity({
      id: "same-id",
      displayName: "Alice",
      role: "owner",
      ageBand: "adult",
    });
    const b = generatePersonIdentity({
      id: "same-id",
      displayName: "Bob",
      role: "owner",
      ageBand: "adult",
    });
    expect(a.appearance).toEqual(b.appearance);
  });

  it("role does not change facial DNA", () => {
    for (const role of PERSON_ROLES) {
      const p = generatePersonIdentity({
        id: "role-check",
        displayName: "Role Check",
        role,
        ageBand: "adult",
      });
      expect(p.appearance.faceBaseId).toBe(generate("role-check").appearance.faceBaseId);
    }
  });
});

describe("rerollPersonAppearance", () => {
  it("increments revision and changes appearance", () => {
    const base = generate("rr-1");
    const next = rerollPersonAppearance(base);
    expect(next.appearance.revision).toBe(1);
    expect(next.appearance).not.toEqual(base.appearance);
  });

  it("preserves biography exactly", () => {
    const base = generate("rr-2");
    const next = rerollPersonAppearance(base);
    expect(next.biography).toEqual(base.biography);
    expect(next.id).toBe(base.id);
  });

  it("is deterministic — same revision produces same DNA", () => {
    const base = generate("rr-3");
    expect(rerollPersonAppearance(base)).toEqual(rerollPersonAppearance(base));
  });

  it("repeated rerolls keep incrementing", () => {
    let p = generate("rr-4");
    for (let i = 1; i <= 3; i++) {
      p = rerollPersonAppearance(p);
      expect(p.appearance.revision).toBe(i);
    }
  });
});

describe("helpers", () => {
  it("getPersonDisplayName falls back to Unknown", () => {
    expect(getPersonDisplayName(null)).toBe("Unknown");
    expect(getPersonDisplayName(createStubPersonIdentity({ displayName: "Zed" }))).toBe("Zed");
  });

  it("getPersonAge derives age from birthYear and day", () => {
    const id = createStubPersonIdentity();
    id.biography.birthYear = 2000;
    expect(getPersonAge(1, id)).toBe(26);
    expect(getPersonAge(366, id)).toBe(27);
    expect(getPersonAge(1, null)).toBe(0);
  });

  it("getPersonAgeBand maps ages to bands", () => {
    expect(getPersonAgeBand(20)).toBe("young");
    expect(getPersonAgeBand(30)).toBe("adult");
    expect(getPersonAgeBand(50)).toBe("mature");
    expect(getPersonAgeBand(70)).toBe("senior");
  });
});
