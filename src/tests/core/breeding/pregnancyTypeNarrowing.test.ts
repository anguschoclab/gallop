import { describe, it, expect } from "vitest";
import { resolvePregnancies } from "@/core/breeding/pregnancy";
import { generateHorse } from "@/core/horse/horseFactory";
import { makeUnowned, makePlayerOwned } from "@/core/horse/ownership";
import type { Horse, Pregnancy } from "@/game/types";
import type { HorseId } from "@/core/types/branded";

/**
 * Type-narrowing test for resolvePregnancies.
 *
 * Currently the `state` parameter is typed as
 *   Pick<GameState, "horses" | "userSettings" | "reservedHorseNames">
 * which forces core to import from @/game/types (GameState).
 *
 * After the refactor, the parameter will accept a plain object:
 *   { horses: Horse[]; userSettings?: UserSettings; reservedHorseNames?: Set<string> }
 *
 * This test verifies the function works when called with a minimal
 * plain object (not a full GameState), proving the type narrowing is safe.
 */

describe("resolvePregnancies type narrowing", () => {
  it("accepts a plain object without full GameState", () => {
    const sire = generateHorse({ tier: "elite", ownership: makeUnowned() });
    sire.id = "sire-1";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", ownership: makePlayerOwned() });
    dam.id = "dam-1";
    dam.gender = "mare";
    dam.age = 3;
    dam.hemisphere = "Northern";

    const pregnancy: Pregnancy = {
      id: "preg-1",
      sireId: sire.id,
      damId: dam.id,
      sireName: sire.name,
      damName: dam.name,
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
      isPlayerOwned: true,
    };

    const horses: Horse[] = [sire, dam];
    const horsesRecord = Object.fromEntries(horses.map((h) => [h.id, h])) as Record<HorseId, Horse>;

    // Call with a minimal plain object — NOT a full GameState
    const result = resolvePregnancies([pregnancy], horses, [], new Set(), 31, {
      horses: horsesRecord,
      userSettings: undefined,
      reservedHorseNames: undefined,
    });

    expect(result.logs.length).toBeGreaterThan(0);
  });

  it("works when state is omitted entirely", () => {
    const sire = generateHorse({ tier: "elite", ownership: makeUnowned() });
    sire.id = "sire-2";
    sire.gender = "horse";
    sire.age = 5;

    const dam = generateHorse({ tier: "elite", ownership: makePlayerOwned() });
    dam.id = "dam-2";
    dam.gender = "mare";
    dam.age = 3;

    const pregnancy: Pregnancy = {
      id: "preg-2",
      sireId: sire.id,
      damId: dam.id,
      sireName: sire.name,
      damName: dam.name,
      conceivedDay: 1,
      dueDay: 31,
      resolved: false,
      liveFoalGuarantee: false,
      reBreedingAttempts: 0,
      refunded: false,
      isPlayerOwned: true,
    };

    const horses: Horse[] = [sire, dam];

    // state is optional — should work without it
    const result = resolvePregnancies([pregnancy], horses, [], new Set(), 31);

    expect(result.logs.length).toBeGreaterThan(0);
  });
});
