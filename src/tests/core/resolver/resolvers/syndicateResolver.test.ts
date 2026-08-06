import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolveSyndicationIntent } from "@/core/resolver/resolvers/syndicateResolver";
import { GameState, Horse, Syndicate } from "@/game/types";
import {
  SyndicateCreationIntent,
  SharePurchaseIntent,
  ShareSaleIntent,
} from "@/core/resolver/intents";

vi.mock("@/game/uuid", () => ({ generateUUID: () => "test-uuid-1234" }));
vi.mock("@/core/uuid", () => ({ generateUUID: () => "test-uuid-1234" }));

describe("syndicateResolver", () => {
  let state: GameState;
  beforeEach(() => {
    state = {
      horses: {},
      syndicates: { syndicate_1: { stallionName: "Stallion" } as Syndicate },
    } as unknown as GameState;
  });

  it("resolves syndicate_creation", () => {
    const intent = {
      type: "syndicate_creation",
      stallionId: "stallion_1",
      day: 1,
      entityId: "s",
      source: "player",
      priority: 1,
      totalShares: 40,
    } as SyndicateCreationIntent;
    const map = new Map<string, Horse>([["stallion_1", { name: "Horse" } as Horse]]);
    const impacts = resolveSyndicationIntent(intent, state, 1, map);
    expect(impacts[0]).toMatchObject({
      type: "syndicate_creation",
      stallionName: "Horse",
      totalShares: 40,
    });
  });

  it("resolves share_purchase", () => {
    const intent = {
      type: "share_purchase",
      syndicateId: "syndicate_1",
      shares: 5,
      day: 2,
      entityId: "s",
      source: "player",
      priority: 1,
    } as SharePurchaseIntent;
    const impacts = resolveSyndicationIntent(intent, state, 2);
    expect(impacts[0]).toMatchObject({
      type: "share_transaction",
      shares: 5,
      buyerStableId: "player",
    });
  });

  it("resolves share_sale", () => {
    const intent = {
      type: "share_sale",
      syndicateId: "syndicate_1",
      shares: 2,
      day: 3,
      entityId: "s",
      source: "player",
      priority: 1,
    } as ShareSaleIntent;
    const impacts = resolveSyndicationIntent(intent, state, 3);
    expect(impacts[0]).toMatchObject({
      type: "share_transaction",
      shares: -2,
      sellerStableId: "player",
    });
  });
});
