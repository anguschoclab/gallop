/**
 * Tests for private sale expiry phase
 */

import { describe, it, expect } from "vitest";
import { privateSaleExpiryPhase } from "@/core/time/phases/privateSaleExpiry";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { makeGameState } from "@/tests/helpers/sampleGameState";
import { createMockPipelineContext } from "@/tests/helpers/testTypes";
import type { GameState, PrivateSaleOffer } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";

describe("privateSaleExpiryPhase", () => {
  const createTestState = (): GameState => makeGameState({ day: 10 }) as GameState;

  const createContext = (state: GameState): PipelineContext =>
    createMockPipelineContext({ state, newDay: 10 });

  const makeOffer = (overrides: Partial<PrivateSaleOffer>): PrivateSaleOffer => ({
    id: "offer-1",
    horseId: "horse-1",
    toStableId: "stable-1",
    amount: 5000,
    status: "pending",
    createdDay: 8,
    expiresDay: 9,
    ...overrides,
  });

  it("should have correct name", () => {
    expect(privateSaleExpiryPhase.name).toBe("privateSaleExpiry");
  });

  it("should expire pending offers past their expiry day", () => {
    const state: GameState = {
      ...createTestState(),
      horses: [createTestHorse({ id: "horse-1", name: "Thunder" })],
      npcStables: [{ id: "stable-1", name: "Green Acres" } as any],
      privateSaleOffers: [makeOffer({ status: "pending", expiresDay: 9 })],
    };

    const result = privateSaleExpiryPhase.execute(createContext(state));
    expect(result.state.privateSaleOffers).toHaveLength(1);
    expect(result.state.privateSaleOffers![0].status).toBe("expired");
  });

  it("should expire countered offers past their expiry day", () => {
    const state: GameState = {
      ...createTestState(),
      horses: [createTestHorse({ id: "horse-1" })],
      npcStables: [{ id: "stable-1", name: "Green Acres" } as any],
      privateSaleOffers: [makeOffer({ status: "countered", expiresDay: 9 })],
    };

    const result = privateSaleExpiryPhase.execute(createContext(state));
    expect(result.state.privateSaleOffers![0].status).toBe("expired");
  });

  it("should not expire offers not yet past expiry day", () => {
    const state: GameState = {
      ...createTestState(),
      horses: [createTestHorse({ id: "horse-1" })],
      npcStables: [{ id: "stable-1", name: "Green Acres" } as any],
      privateSaleOffers: [makeOffer({ status: "pending", expiresDay: 15 })],
    };

    const result = privateSaleExpiryPhase.execute(createContext(state));
    expect(result.state.privateSaleOffers![0].status).toBe("pending");
  });

  it("should handle multiple expired offers with correct horse/stable names", () => {
    const state: GameState = {
      ...createTestState(),
      horses: [
        createTestHorse({ id: "horse-1", name: "Thunder" }),
        createTestHorse({ id: "horse-2", name: "Lightning" }),
      ],
      npcStables: [
        { id: "stable-1", name: "Green Acres" } as any,
        { id: "stable-2", name: "Blue Hills" } as any,
      ],
      privateSaleOffers: [
        makeOffer({ id: "o1", horseId: "horse-1", toStableId: "stable-1", expiresDay: 9 }),
        makeOffer({ id: "o2", horseId: "horse-2", toStableId: "stable-2", expiresDay: 9 }),
      ],
    };

    const result = privateSaleExpiryPhase.execute(createContext(state));
    expect(result.state.privateSaleOffers).toHaveLength(2);
    expect(result.state.privateSaleOffers!.every((o) => o.status === "expired")).toBe(true);
    expect(result.logs).toHaveLength(2);
    expect(result.logs[0].text).toContain("Thunder");
    expect(result.logs[0].text).toContain("Green Acres");
    expect(result.logs[1].text).toContain("Lightning");
    expect(result.logs[1].text).toContain("Blue Hills");
  });

  it("should handle offer with non-existent horse gracefully", () => {
    const state: GameState = {
      ...createTestState(),
      horses: [],
      npcStables: [{ id: "stable-1", name: "Green Acres" } as any],
      privateSaleOffers: [makeOffer({ horseId: "nonexistent", expiresDay: 9 })],
    };

    const result = privateSaleExpiryPhase.execute(createContext(state));
    expect(result.state.privateSaleOffers![0].status).toBe("expired");
    expect(result.logs[0].text).toContain("horse");
  });

  it("should handle offer with non-existent stable gracefully", () => {
    const state: GameState = {
      ...createTestState(),
      horses: [createTestHorse({ id: "horse-1", name: "Thunder" })],
      npcStables: [],
      privateSaleOffers: [makeOffer({ toStableId: "nonexistent", expiresDay: 9 })],
    };

    const result = privateSaleExpiryPhase.execute(createContext(state));
    expect(result.state.privateSaleOffers![0].status).toBe("expired");
    expect(result.logs[0].text).toContain("stable");
  });

  it("should return context unchanged when no offers", () => {
    const state: GameState = {
      ...createTestState(),
      privateSaleOffers: [],
    };

    const ctx = createContext(state);
    const result = privateSaleExpiryPhase.execute(ctx);
    expect(result).toBe(ctx);
  });

  it("should prune expired offers older than 7 days", () => {
    const state: GameState = {
      ...createTestState(),
      horses: [createTestHorse({ id: "horse-1" })],
      npcStables: [{ id: "stable-1", name: "Green Acres" } as any],
      privateSaleOffers: [
        makeOffer({ id: "old", status: "expired", createdDay: 1, expiresDay: 2 }),
        makeOffer({ id: "recent", status: "expired", createdDay: 8, expiresDay: 9 }),
      ],
    };

    const result = privateSaleExpiryPhase.execute(createContext(state));
    expect(result.state.privateSaleOffers).toHaveLength(1);
    expect(result.state.privateSaleOffers![0].id).toBe("recent");
  });
});
