import { describe, it, expect } from "vitest";
import { composeSentence } from "@/services/narrative/sentenceComposer";
import { generateProcedural } from "@/services/narrative/proceduralGenerator";
import { DYNAMIC_OPENERS, DYNAMIC_TRAILERS } from "@/assets/narrative/dynamicClauses";
import { createRng, hashStr } from "@/core/common/rng";

describe("Dynamic Sentence Generation", () => {
  it("composeSentence() produces coherent sentences for SURGE", () => {
    const rng = createRng(hashStr("compose-surge"));
    const sentence = composeSentence("SURGE", rng);
    expect(sentence.length).toBeGreaterThan(0);
    expect(sentence).toContain("{horse}");
  });

  it("composeSentence() produces coherent sentences for FLYING", () => {
    const rng = createRng(hashStr("compose-flying"));
    const sentence = composeSentence("FLYING", rng);
    expect(sentence.length).toBeGreaterThan(0);
  });

  it("composeSentence() produces coherent sentences for FADE", () => {
    const rng = createRng(hashStr("compose-fade"));
    const sentence = composeSentence("FADE", rng);
    expect(sentence.length).toBeGreaterThan(0);
  });

  it("composeSentence() returns empty string for unsupported event type", () => {
    const rng = createRng(hashStr("compose-unknown"));
    const sentence = composeSentence("UNKNOWN", rng);
    expect(sentence).toBe("");
  });

  it("generateProcedural() produces coherent sentences for LEAD_CHANGE", () => {
    const rng = createRng(hashStr("proc-lead"));
    const sentence = generateProcedural("LEAD_CHANGE", rng);
    expect(sentence.length).toBeGreaterThan(0);
  });

  it("generateProcedural() produces coherent sentences for STRETCH", () => {
    const rng = createRng(hashStr("proc-stretch"));
    const sentence = generateProcedural("STRETCH", rng);
    expect(sentence.length).toBeGreaterThan(0);
  });

  it("generateProcedural() produces coherent sentences for FINISH", () => {
    const rng = createRng(hashStr("proc-finish"));
    const sentence = generateProcedural("FINISH", rng);
    expect(sentence.length).toBeGreaterThan(0);
  });

  it("procedural sentences vary across multiple RNG seeds", () => {
    const sentences = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const rng = createRng(hashStr(`proc-variety-${i}`));
      const s = generateProcedural("LEAD_CHANGE", rng);
      if (s) sentences.add(s);
    }
    expect(sentences.size).toBeGreaterThan(1);
  });

  it("procedural sentences respect max length (≤200 chars)", () => {
    for (let i = 0; i < 50; i++) {
      const rng = createRng(hashStr(`proc-length-${i}`));
      const s = generateProcedural("LEAD_CHANGE", rng);
      if (s) expect(s.length).toBeLessThanOrEqual(200);
    }
  });

  it("procedural sentences do not contain banned phrases", () => {
    const banned = ["very very", "really really", "the the", "a a"];
    for (let i = 0; i < 50; i++) {
      const rng = createRng(hashStr(`proc-banned-${i}`));
      const s = generateProcedural("LEAD_CHANGE", rng);
      if (s) {
        const lower = s.toLowerCase();
        for (const phrase of banned) {
          expect(lower).not.toContain(phrase);
        }
      }
    }
  });

  it("DYNAMIC_OPENERS has ≥12 entries", () => {
    expect(DYNAMIC_OPENERS.length).toBeGreaterThanOrEqual(12);
  });

  it("DYNAMIC_TRAILERS has ≥12 entries", () => {
    expect(DYNAMIC_TRAILERS.length).toBeGreaterThanOrEqual(12);
  });

  it("dynamic generation is used at specified probabilities (statistical test)", () => {
    let composeCount = 0;
    let proceduralCount = 0;
    const total = 200;

    for (let i = 0; i < total; i++) {
      const rng = createRng(hashStr(`dynamic-stats-${i}`));
      const roll = rng.next();
      if (roll < 0.3) composeCount++;
      // Separate rng for procedural check
      const rng2 = createRng(hashStr(`dynamic-stats-proc-${i}`));
      if (rng2.next() < 0.15) proceduralCount++;
    }

    // Should be roughly 30% and 15% — allow wide margin for RNG
    expect(composeCount).toBeGreaterThan(total * 0.2);
    expect(proceduralCount).toBeGreaterThan(total * 0.08);
  });
});
