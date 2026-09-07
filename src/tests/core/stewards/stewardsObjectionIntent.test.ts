import { describe, it, expect } from "vitest";
import { stewardsPhase } from "@/core/time/phases/stewardsPhase";
import type { PipelineContext } from "@/core/time/pipeline";
import type { StewardsInquiryIntent } from "@/core/resolver/systemIntents";
import type { GameState } from "@/game/types";
import { createDefaultGameState } from "@/game/store/state";
import { createRng } from "@/core/common/rng";

describe("stewardsPhase: StewardsInquiryIntent processing", () => {
  it("processes StewardsInquiryIntent into an inquiry impact", () => {
    const state: GameState = {
      ...createDefaultGameState(),
      day: 15,
      horses: {
        "horse-1": { id: "horse-1", name: "Speedy" } as any,
        "horse-2": { id: "horse-2", name: "Bumper" } as any,
      },
      races: {
        "race-10": {
          id: "race-10",
          name: "Derby Trial",
          resolved: true,
          entries: [
            { horseId: "horse-1", jockeyId: "j-1" },
            { horseId: "horse-2", jockeyId: "j-2" },
          ],
          result: [
            { horseId: "horse-2", position: 1, time: 120 },
            { horseId: "horse-1", position: 2, time: 120.05 },
          ],
        } as any,
      },
    };

    const objectionIntent: StewardsInquiryIntent = {
      id: "intent-obj-1",
      entityId: "horse-1",
      source: "player",
      day: 15,
      priority: 90,
      type: "stewards_inquiry",
      raceId: "race-10",
      accusedHorseId: "horse-2",
      inquiryType: "interference",
      description: "Interference in the final furlong",
      reportingHorseId: "horse-1",
    };

    const context: PipelineContext = {
      state,
      newDay: 16,
      dailyRng: createRng(123),
      intents: [objectionIntent],
      impacts: [],
    } as any;

    const result = stewardsPhase.execute(context);
    const inquiryImpacts = result.impacts.filter((i) => i.type === "stewards_inquiry");
    expect(inquiryImpacts.length).toBeGreaterThanOrEqual(1);

    const match = inquiryImpacts.find(
      (imp: any) => imp.inquiry?.accusedHorseId === "horse-2" && imp.inquiry?.raceId === "race-10",
    );
    expect(match).toBeDefined();
  });
});
