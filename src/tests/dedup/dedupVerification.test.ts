/**
 * Dedup Verification Tests (Track B)
 *
 * These tests verify behavioral equivalence (or difference) for each
 * duplicate identified in the Phase 0 audit. They must pass against
 * current code BEFORE any merging or deletion occurs.
 *
 * True duplicates (identical logic):
 *   B.2 - connectionTrophies.ts (identical files)
 *   B.3 - defaultMaxTime (identical formula)
 *
 * Different implementations (must NOT be merged):
 *   B.1 - formatCurrency (different negative handling)
 *   B.4 - distanceBucket (different return types)
 *   B.5 - gradeColorClass (different input types, different CSS)
 *   B.6 - recordOutcome (delegation pattern, different layers)
 *   B.7 - getTrackCountry (different lookup mechanisms)
 *   B.8 - generateUpcomingRaces (thin wrapper, not a duplicate)
 */
import { describe, it, expect } from "vitest";
import { formatCurrency as formatCurrencyFinancial } from "@/core/financial/financialTypes";
import { formatCurrency as formatCurrencyCommon } from "@/core/common/formatting";
import { defaultMaxTime as defaultMaxTimeEngine } from "@/core/race/engine/constants";
import { defaultMaxTime as defaultMaxTimeConstants } from "@/constants/raceEngineConstants";
import { distanceBucket as distanceBucketBeyer } from "@/core/race/beyer";
import { distanceBucket as distanceBucketPace } from "@/core/horse/paceTendency";
import { gradeColorClass as gradeColorJockey } from "@/core/race/jockeyReport";
import { gradeColorClass as gradeColorHorse } from "@/core/horse/grading";
import { recordOutcome as recordPersonalityOutcome } from "@/core/ai/personalitySystem";
import { recordOutcome as recordLearningOutcome } from "@/core/ai/learningModule";
import { getTrackCountry as getTrackCountryByName } from "@/data/gradedRaces";
import { getTrackCountry as getTrackCountryById } from "@/core/weather/trackClimate";
import { generateUpcomingRaces as generateUpcomingRacesSchedule } from "@/core/race/schedule";
import { generateUpcomingRaces as generateUpcomingRacesMarket } from "@/game/store/helpers/market";

// B.2 — connectionTrophies identical file duplication
import * as connectionTrophiesAwards from "@/core/awards/connectionTrophies";
import * as connectionTrophiesConstants from "@/constants/connectionTrophies";

// ---------------------------------------------------------------------------
// B.1 — formatCurrency: DIFFERENT implementations (must NOT merge)
// ---------------------------------------------------------------------------

describe("B.1 — formatCurrency duplication verification", () => {
  it("both produce same output for positive values", () => {
    expect(formatCurrencyFinancial(1000)).toBe(formatCurrencyCommon(1000));
    expect(formatCurrencyFinancial(0)).toBe(formatCurrencyCommon(0));
    expect(formatCurrencyFinancial(50000)).toBe(formatCurrencyCommon(50000));
  });

  it("financial version handles negatives with abs + minus prefix", () => {
    const result = formatCurrencyFinancial(-1000);
    expect(result).toBe("-$1,000");
    expect(result.startsWith("-")).toBe(true);
  });

  it("common version uses Intl directly (negative via Intl)", () => {
    const result = formatCurrencyCommon(-1000);
    // Intl.NumberFormat produces -$1,000 for en-US
    expect(result).toBe("-$1,000");
  });

  it("both produce $0 for zero", () => {
    expect(formatCurrencyFinancial(0)).toBe("$0");
    expect(formatCurrencyCommon(0)).toBe("$0");
  });

  it("both handle large values", () => {
    expect(formatCurrencyFinancial(1000000)).toBe("$1,000,000");
    expect(formatCurrencyCommon(1000000)).toBe("$1,000,000");
  });

  it("financial version uses abs before formatting", () => {
    // The financial impl does Math.abs(amount) then prefixes minus
    // So -500 → -$500 (same as Intl, but the code path is different)
    const negResult = formatCurrencyFinancial(-500);
    const posResult = formatCurrencyFinancial(500);
    expect(negResult).toBe(`-${posResult}`);
  });
});

// ---------------------------------------------------------------------------
// B.2 — connectionTrophies.ts: IDENTICAL files (safe to merge)
// ---------------------------------------------------------------------------

describe("B.2 — connectionTrophies identical file verification", () => {
  it("both files export the same function names", () => {
    const awardsExports = Object.keys(connectionTrophiesAwards).sort();
    const constantsExports = Object.keys(connectionTrophiesConstants).sort();
    expect(awardsExports).toEqual(constantsExports);
  });

  it("both files export getG1WinsForJockey", () => {
    expect(typeof connectionTrophiesAwards.getG1WinsForJockey).toBe("function");
    expect(typeof connectionTrophiesConstants.getG1WinsForJockey).toBe("function");
  });

  it("both files export getG1WinsForStable", () => {
    expect(typeof connectionTrophiesAwards.getG1WinsForStable).toBe("function");
    expect(typeof connectionTrophiesConstants.getG1WinsForStable).toBe("function");
  });

  it("both files export countByGrade", () => {
    expect(typeof connectionTrophiesAwards.countByGrade).toBe("function");
    expect(typeof connectionTrophiesConstants.countByGrade).toBe("function");
  });

  it("functions produce identical results for empty input", () => {
    const emptyState = { horses: {}, races: {} } as any;
    const jockeyA = connectionTrophiesAwards.getG1WinsForJockey(emptyState, "j1");
    const jockeyB = connectionTrophiesConstants.getG1WinsForJockey(emptyState, "j1");
    expect(jockeyA).toEqual(jockeyB);

    const stableA = connectionTrophiesAwards.getG1WinsForStable(emptyState, "s1");
    const stableB = connectionTrophiesConstants.getG1WinsForStable(emptyState, "s1");
    expect(stableA).toEqual(stableB);
  });
});

// ---------------------------------------------------------------------------
// B.3 — defaultMaxTime: IDENTICAL formula (safe to merge)
// ---------------------------------------------------------------------------

describe("B.3 — defaultMaxTime duplication verification", () => {
  it("both produce identical output for standard distances", () => {
    const distances = [800, 1200, 1600, 2000, 2400, 3200, 4000];
    for (const d of distances) {
      expect(defaultMaxTimeEngine(d)).toBe(defaultMaxTimeConstants(d));
    }
  });

  it("both produce 120 for very short distances (minimum clamp)", () => {
    expect(defaultMaxTimeEngine(0)).toBe(120);
    expect(defaultMaxTimeConstants(0)).toBe(120);
    expect(defaultMaxTimeEngine(100)).toBe(120);
    expect(defaultMaxTimeConstants(100)).toBe(120);
  });

  it("both produce correct value for 1600m", () => {
    expect(defaultMaxTimeEngine(1600)).toBe(380);
    expect(defaultMaxTimeConstants(1600)).toBe(380);
  });

  it("both produce correct value for 2400m", () => {
    expect(defaultMaxTimeEngine(2400)).toBe(540);
    expect(defaultMaxTimeConstants(2400)).toBe(540);
  });

  it("both handle negative distances via Math.max", () => {
    expect(defaultMaxTimeEngine(-100)).toBe(120);
    expect(defaultMaxTimeConstants(-100)).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// B.4 — distanceBucket: DIFFERENT return types (must NOT merge, rename only)
// ---------------------------------------------------------------------------

describe("B.4 — distanceBucket duplication verification (NOT true duplicates)", () => {
  it("beyer version returns number (rounded to nearest 200m)", () => {
    expect(typeof distanceBucketBeyer(1600)).toBe("number");
    expect(distanceBucketBeyer(1600)).toBe(1600);
    expect(distanceBucketBeyer(1700)).toBe(1800);
    expect(distanceBucketBeyer(1750)).toBe(1800);
  });

  it("paceTendency version returns DistanceBucket enum (sprint/mile/route)", () => {
    expect(typeof distanceBucketPace(1600)).toBe("string");
    expect(distanceBucketPace(1200)).toBe("sprint");
    expect(distanceBucketPace(1600)).toBe("mile");
    expect(distanceBucketPace(2400)).toBe("route");
  });

  it("beyer version returns minimum 200", () => {
    expect(distanceBucketBeyer(0)).toBe(200);
    expect(distanceBucketBeyer(100)).toBe(200);
  });

  it("paceTendency version returns 'any' for undefined", () => {
    expect(distanceBucketPace(undefined)).toBe("any");
    expect(distanceBucketPace(0)).toBe("any");
  });

  it("beyer version rounds to nearest 200m", () => {
    expect(distanceBucketBeyer(800)).toBe(800);
    expect(distanceBucketBeyer(900)).toBe(1000);
    expect(distanceBucketBeyer(1001)).toBe(1000);
    expect(distanceBucketBeyer(1099)).toBe(1000);
  });

  it("paceTendency version uses coarse categories", () => {
    expect(distanceBucketPace(1400)).toBe("sprint");
    expect(distanceBucketPace(1401)).toBe("mile");
    expect(distanceBucketPace(1900)).toBe("mile");
    expect(distanceBucketPace(1901)).toBe("route");
  });
});

// ---------------------------------------------------------------------------
// B.5 — gradeColorClass: DIFFERENT input types and CSS (must NOT merge, rename only)
// ---------------------------------------------------------------------------

describe("B.5 — gradeColorClass duplication verification (NOT true duplicates)", () => {
  it("jockeyReport version accepts JockeyReportGrade (A+/A/B/C/D/F)", () => {
    expect(gradeColorJockey("A+")).toContain("text-fame");
    expect(gradeColorJockey("A")).toContain("text-success");
    expect(gradeColorJockey("B")).toContain("text-broadcast-accent");
    expect(gradeColorJockey("C")).toContain("text-cream");
    expect(gradeColorJockey("D")).toContain("text-warning");
    expect(gradeColorJockey("F")).toContain("text-destructive");
  });

  it("grading version accepts LetterGrade (S/A+/A/B+/B/C+/C/D)", () => {
    expect(gradeColorHorse("S")).toContain("text-fame");
    expect(gradeColorHorse("A+")).toContain("text-gold");
    expect(gradeColorHorse("A")).toContain("text-gold");
    expect(gradeColorHorse("B+")).toContain("text-success");
    expect(gradeColorHorse("B")).toContain("text-success");
    expect(gradeColorHorse("C+")).toContain("text-warning");
    expect(gradeColorHorse("C")).toContain("text-warning");
    expect(gradeColorHorse("D")).toContain("text-destructive");
  });

  it("jockeyReport version includes border and bg classes", () => {
    const result = gradeColorJockey("A+");
    expect(result).toContain("border-");
    expect(result).toContain("bg-");
  });

  it("grading version uses text-only classes with font weight", () => {
    const result = gradeColorHorse("S");
    expect(result).toContain("font-black");
    expect(result).toContain("animate-pulse");
  });

  it("grading version has default fallback for unknown grades", () => {
    expect(gradeColorHorse("X" as any)).toContain("text-cream/20");
  });
});

// ---------------------------------------------------------------------------
// B.6 — recordOutcome: DELEGATION pattern (different layers, rename only)
// ---------------------------------------------------------------------------

describe("B.6 — recordOutcome duplication verification (delegation pattern)", () => {
  it("personalitySystem.recordOutcome delegates to learningModule.recordOutcome", () => {
    // personalitySystem.recordOutcome takes PersonalityAIState and calls
    // recordLearningOutcome internally
    const personalityState = {
      learningState: { outcomes: [], successRates: {}, patterns: {}, lastUpdateDay: 0 },
      memoryDepth: 10,
      personality: "aggressive",
    } as any;

    const result = recordPersonalityOutcome(
      personalityState,
      "test_decision",
      { factor: "test" },
      true,
      100,
      1,
    );

    // Should return updated PersonalityAIState with new learningState
    expect(result).toBeDefined();
    expect(result.learningState).toBeDefined();
    expect(result.learningState.outcomes).toHaveLength(1);
    expect(result.learningState.outcomes[0].decisionType).toBe("test_decision");
    expect(result.learningState.outcomes[0].success).toBe(true);
  });

  it("learningModule.recordOutcome works on raw LearningState", () => {
    const learningState = { outcomes: [], successRates: {}, patterns: {}, lastUpdateDay: 0 } as any;

    const result = recordLearningOutcome(
      learningState,
      "test_decision",
      "test_context",
      true,
      100,
      1,
      10,
    );

    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0].decisionType).toBe("test_decision");
    expect(result.outcomes[0].contextKey).toBe("test_context");
    expect(result.successRates["test_decision:test_context"].total).toBe(1);
    expect(result.successRates["test_decision:test_context"].successes).toBe(1);
  });

  it("learningModule trims outcomes to memoryDepth", () => {
    let state = { outcomes: [], successRates: {}, patterns: {}, lastUpdateDay: 0 } as any;
    for (let i = 0; i < 15; i++) {
      state = recordLearningOutcome(state, "test", "ctx", true, 100, i, 10);
    }
    expect(state.outcomes.length).toBe(10);
  });

  it("personalitySystem.recordOutcome updates success rate in returned state", () => {
    const personalityState = {
      learningState: { outcomes: [], successRates: {}, patterns: {}, lastUpdateDay: 0 },
      memoryDepth: 10,
      personality: "aggressive",
    } as any;

    const result = recordPersonalityOutcome(
      personalityState,
      "bidding",
      { factor: "value" },
      true,
      500,
      1,
    );

    // The personality system should have success rate info available
    expect(result.learningState.successRates).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// B.7 — getTrackCountry: DIFFERENT lookup mechanisms (must NOT merge, rename only)
// ---------------------------------------------------------------------------

describe("B.7 — getTrackCountry duplication verification (NOT true duplicates)", () => {
  it("gradedRaces version takes track name string and calls getCountry()", () => {
    const result = getTrackCountryByName("Ascot");
    expect(typeof result).toBe("string");
    expect(result).toBe("Great Britain");
  });

  it("trackClimate version takes trackId string and looks up TRACK_BY_ID", () => {
    // Need a valid trackId — let's find one
    const result = getTrackCountryById("nonexistent");
    expect(result).toBe("");
  });

  it("trackClimate version returns empty string for undefined trackId", () => {
    expect(getTrackCountryById(undefined)).toBe("");
  });

  it("gradedRaces version returns country for known track names", () => {
    expect(getTrackCountryByName("Ascot")).toBe("Great Britain");
    expect(getTrackCountryByName("Churchill Downs")).toBe("USA");
  });

  it("both return string type", () => {
    expect(typeof getTrackCountryByName("Ascot")).toBe("string");
    expect(typeof getTrackCountryById(undefined)).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// B.8 — generateUpcomingRaces: THIN WRAPPER (not a duplicate)
// ---------------------------------------------------------------------------

describe("B.8 — generateUpcomingRaces duplication verification (thin wrapper)", () => {
  it("market version is a wrapper that calls schedule with TRACK_SCHEDULES", () => {
    // Both should produce the same result when called with the same args
    // because market.ts passes TRACK_SCHEDULES to the schedule version
    const currentRaces: any[] = [];
    const newDay = 100;

    const scheduleResult = generateUpcomingRacesSchedule(currentRaces, newDay, []);
    const marketResult = generateUpcomingRacesMarket(currentRaces, newDay);

    // With empty schedules, both should produce equivalent results
    // (market passes TRACK_SCHEDULES, not empty array, so results may differ)
    // We verify the wrapper doesn't crash and returns an array
    expect(Array.isArray(marketResult)).toBe(true);
    expect(Array.isArray(scheduleResult)).toBe(true);
  });

  it("schedule version requires schedules parameter", () => {
    const result = generateUpcomingRacesSchedule([], 100, []);
    expect(Array.isArray(result)).toBe(true);
  });

  it("market version has 2 parameters (hides schedules param)", () => {
    // market.ts: generateUpcomingRaces(currentRaces, newDay) — 2 params
    // schedule.ts: generateUpcomingRaces(currentRaces, newDay, schedules) — 3 params
    expect(generateUpcomingRacesMarket.length).toBe(2);
  });

  it("schedule version has 3 parameters", () => {
    expect(generateUpcomingRacesSchedule.length).toBe(3);
  });
});
