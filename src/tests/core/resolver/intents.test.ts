import { describe, it, expect } from "vitest";
import type { AnyIntent, TransportIntent } from "@/core/resolver/intents";

describe("TransportIntent", () => {
  it("is a valid member of AnyIntent union", () => {
    const intent: TransportIntent = {
      id: "test-1",
      entityId: "horse-1",
      source: "player",
      day: 1,
      priority: 50,
      type: "transport",
      transportId: "transport-1",
      cost: 500,
    };
    const _union: AnyIntent = intent;
    expect(_union.type).toBe("transport");
  });

  it("has required fields for transport processing", () => {
    const intent: TransportIntent = {
      id: "test-2",
      entityId: "horse-2",
      source: "player",
      day: 5,
      priority: 50,
      type: "transport",
      transportId: "transport-2",
      cost: 1000,
    };
    expect(intent.transportId).toBeDefined();
    expect(intent.cost).toBeGreaterThan(0);
    expect(intent.type).toBe("transport");
  });
});
