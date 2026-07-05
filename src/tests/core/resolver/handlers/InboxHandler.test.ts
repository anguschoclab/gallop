import { describe, it, expect } from "vitest";
import { InboxHandler } from "@/core/resolver/handlers/InboxHandler";
import type { GameState } from "@/game/store/state";
import type { InboxImpact } from "@/core/resolver/impacts/index";

describe("InboxHandler", () => {
  it("inbox_message pushes message with generated ID and day", () => {
    const handler = new InboxHandler();
    const state = { inbox: [] } as unknown as GameState;

    const impact: InboxImpact = {
      id: "imp-1",
      intentId: "",
      day: 42,
      phase: "raceResolution",
      logLevel: "always",
      type: "inbox_message",
      message: {
        day: 42,
        category: "race",
        priority: "info",
        title: "Race Result",
        body: "Your horse finished 3rd",
      },
      reason: "Race notification",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.inbox).toHaveLength(1);
    expect(draft.inbox[0].day).toBe(42);
    expect(draft.inbox[0].title).toBe("Race Result");
    expect(draft.inbox[0].category).toBe("race");
  });

  it("canHandle returns true for inbox_message only", () => {
    const handler = new InboxHandler();
    expect(handler.canHandle("inbox_message")).toBe(true);
    expect(handler.canHandle("cash_change")).toBe(false);
  });
});
