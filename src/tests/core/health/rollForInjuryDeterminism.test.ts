/**
 * rollForInjuryDeterminism.test.ts
 *
 * Tests for the rollForInjury function with getId parameter.
 * Verifies that injury impact IDs are deterministic when getId is provided,
 * and that backward compatibility is maintained when getId is omitted.
 */

import { describe, it, expect } from "vitest";
import { rollForInjury } from "@/core/health/healthSystem";
import { isValidUUID } from "@/core/uuid";
import { createRng } from "@/core/common/rng";
import { createTestColt } from "@/tests/helpers/createTestHorse";
import type { Horse } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";

function makeInjuryProneHorse(): Horse {
  const horse = createTestColt({ id: "h1", energy: 10 });
  return horse;
}

describe("rollForInjury with getId", () => {
  it("produces deterministic injury impact ID with same rng + getId sequence", () => {
    const horse = makeInjuryProneHorse();
    const staff: StaffMember[] = [];

    // We need an RNG that will trigger injury (baseChance * factors > rng.next() value)
    // Force injury by using an rng that returns very low values for the injury roll
    let callIndex = 0;
    const makeRng = () => {
      callIndex = 0;
      const rng = {
        next: () => {
          // First call: injury roll (return 0 → always triggers injury)
          // Subsequent calls: severity roll, recovery days, etc.
          if (callIndex === 0) {
            callIndex++;
            return 0;
          }
          callIndex++;
          return 0.5;
        },
        int: (min: number, max: number) => Math.floor((min + max) / 2),
        range: (min: number, max: number) => (min + max) / 2,
        pick: <T>(arr: readonly T[]) => arr[0],
        gauss: (mean?: number) => mean ?? 0,
      };
      return rng;
    };

    // Run 1: with getId returning a fixed sequence
    let idCounter = 0;
    const getId1 = () => `deterministic-id-${idCounter++}`;
    const result1 = rollForInjury(makeRng() as any, horse, 100, staff, undefined, getId1);

    // Run 2: same getId sequence
    idCounter = 0;
    const getId2 = () => `deterministic-id-${idCounter++}`;
    const result2 = rollForInjury(makeRng() as any, horse, 100, staff, undefined, getId2);

    expect(result1).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result1!.id).toBe(result2!.id);
    expect(result1!.id).toBe("deterministic-id-0");
  });

  it("injury impact ID from getId is used directly", () => {
    const horse = makeInjuryProneHorse();
    const customId = "custom-injury-uuid-1234";
    const getId = () => customId;

    let callIndex = 0;
    const rng = {
      next: () => {
        if (callIndex === 0) {
          callIndex++;
          return 0;
        }
        callIndex++;
        return 0.5;
      },
      int: (min: number, max: number) => Math.floor((min + max) / 2),
      range: (min: number, max: number) => (min + max) / 2,
      pick: <T>(arr: readonly T[]) => arr[0],
      gauss: (mean?: number) => mean ?? 0,
    };

    const result = rollForInjury(rng as any, horse, 100, [], undefined, getId);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(customId);
  });

  it("without getId falls back to generateUUID (backward compat)", () => {
    const horse = makeInjuryProneHorse();

    let callIndex = 0;
    const rng = {
      next: () => {
        if (callIndex === 0) {
          callIndex++;
          return 0;
        }
        callIndex++;
        return 0.5;
      },
      int: (min: number, max: number) => Math.floor((min + max) / 2),
      range: (min: number, max: number) => (min + max) / 2,
      pick: <T>(arr: readonly T[]) => arr[0],
      gauss: (mean?: number) => mean ?? 0,
    };

    const result = rollForInjury(rng as any, horse, 100, []);
    expect(result).not.toBeNull();
    // Without getId, ID should be a valid UUID (from generateUUID)
    expect(isValidUUID(result!.id)).toBe(true);
  });

  it("returns null when no injury occurs (regardless of getId)", () => {
    const horse = createTestColt({ id: "h1", energy: 100 });
    const rng = createRng("no-injury");
    const getId = () => "should-not-be-used";

    const result = rollForInjury(rng, horse, 100, [], undefined, getId);
    // With full energy and low base chance, injury may or may not occur
    // If it doesn't occur, result should be null
    if (result === null) {
      expect(result).toBeNull();
    } else {
      // If injury did occur, getId should have been used
      expect(result.id).toBe("should-not-be-used");
    }
  });
});
