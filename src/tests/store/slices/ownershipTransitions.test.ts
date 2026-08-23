import { describe, it, expect } from "vitest";
import {
  isPlayerOwned,
  isNpcOwned,
  isUnowned,
  makePlayerOwned,
  makeNpcOwned,
  makeUnowned,
} from "@/core/horse/ownership";
import { asNpcStableId } from "@/core/types/branded";

describe("Store ownership transitions use ownership field", () => {
  it("quickSellHorse should set ownership to unowned (not owned: false)", () => {
    const before = { ownership: makePlayerOwned() };
    const after = { ownership: makeUnowned() };
    expect(isPlayerOwned(before)).toBe(true);
    expect(isPlayerOwned(after)).toBe(false);
    expect(isUnowned(after)).toBe(true);
  });

  it("acceptPrivateSaleOffer should set ownership to player (not owned: true)", () => {
    const before = { ownership: makeNpcOwned(asNpcStableId("s1")) };
    const after = { ownership: makePlayerOwned() };
    expect(isNpcOwned(before)).toBe(true);
    expect(isPlayerOwned(after)).toBe(true);
  });

  it("auction horse transfer to NPC stable should set ownership to npc", () => {
    const toStableId = "npc-stable-2";
    const ownership = toStableId ? makeNpcOwned(asNpcStableId(toStableId)) : makePlayerOwned();
    expect(isNpcOwned({ ownership })).toBe(true);
  });

  it("auction horse transfer to player (no stableId) should set ownership to player", () => {
    const toStableId: string | undefined = undefined;
    const ownership = toStableId ? makeNpcOwned(asNpcStableId(toStableId)) : makePlayerOwned();
    expect(isPlayerOwned({ ownership })).toBe(true);
  });

  it("syndicate devolution to player should set ownership to player", () => {
    const newStableId: string | undefined = undefined;
    const ownership = newStableId ? makeNpcOwned(asNpcStableId(newStableId)) : makePlayerOwned();
    expect(isPlayerOwned({ ownership })).toBe(true);
  });

  it("syndicate devolution to NPC should set ownership to npc", () => {
    const newStableId = "npc-investor-1";
    const ownership = newStableId ? makeNpcOwned(asNpcStableId(newStableId)) : makePlayerOwned();
    expect(isNpcOwned({ ownership })).toBe(true);
  });
});
