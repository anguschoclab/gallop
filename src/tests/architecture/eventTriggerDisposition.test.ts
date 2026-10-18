import { describe, expect, it } from "vitest";
import { GAME_PIPELINE_PHASES } from "@/platform/time/phases";
import { eventTriggersPhase } from "@/platform/time/phases/eventTriggersPhase";
import manifest from "@/tests/fixtures/campaignManifest.json";

describe("event trigger disposition", () => {
  it("keeps the unregistered trigger infrastructure quarantined out of the authoritative pipeline", () => {
    expect(GAME_PIPELINE_PHASES).not.toContain(eventTriggersPhase);
    expect(manifest.capabilityDispositions["core/time/eventRegistry"]).toMatchObject({
      disposition: "quarantined_unique",
      reason: expect.stringContaining("no registered triggers"),
    });
  });
});
