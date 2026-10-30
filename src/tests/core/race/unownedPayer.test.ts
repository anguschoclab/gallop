import { describe, expect, it } from "vitest";
import {
  generateJockeyFeeImpacts,
  generatePercentageJockeyFeeImpacts,
} from "@/domains/race/simulation/impacts/jockeyFees";
import { createTestHorse } from "@/tests/helpers";
import { makeNpcOwned, makePlayerOwned, makeUnowned } from "@/domains/horse/simulation/ownership";
import { asNpcStableId } from "@/shared/types/branded";
import type { Jockey } from "@/platform/game/types";

const jockey = { id: "j", ridingFee: 800, firstName: "Bill", lastName: "D" } as unknown as Jockey;

describe("jockey fees are billed to the horse's owner, never by default to the player", () => {
  it("player horse → player", () => {
    const h = createTestHorse({ id: "h", ownership: makePlayerOwned() });
    expect(generateJockeyFeeImpacts(h, jockey, 1, "h", "r").cashImpact.entityId).toBe("player");
  });
  it("rival horse → its stable", () => {
    const h = createTestHorse({ id: "h", ownership: makeNpcOwned(asNpcStableId("rival")) });
    expect(generateJockeyFeeImpacts(h, jockey, 1, "h", "r").cashImpact.entityId).toBe("rival");
  });
  it("unowned horse → not the player", () => {
    const h = createTestHorse({ id: "h", ownership: makeUnowned() });
    const id = generateJockeyFeeImpacts(h, jockey, 1, "h", "r").cashImpact.entityId;
    expect(id).not.toBe("player");
    expect(id).not.toBe("");
  });
  it("win-percentage fee for an unowned runner → not the player", () => {
    const imp = generatePercentageJockeyFeeImpacts(jockey, 100_000, 1, false, undefined)!;
    expect(imp.entityId).not.toBe("player");
    expect(imp.entityId).not.toBe("");
  });
});
