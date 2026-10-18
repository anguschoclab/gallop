import { describe, expect, it } from "vitest";
import { GAME_PIPELINE_PHASES } from "@/core/time/phases";
import { ALL_HANDLERS } from "@/core/resolver/handlers";
import { INTENT_CAPABILITY_WAIVERS } from "@/core/resolver/intentCapabilityWaivers";
import { extractDiscriminatedContracts, runCapabilityAudit } from "../../../scripts/orphan-audit";

const ROOT = process.cwd();

describe("capability graph", () => {
  it("derives contracts from discriminated declarations instead of a hardcoded list", () => {
    const contracts = extractDiscriminatedContracts([
      {
        path: "fixture.ts",
        text: `
          interface Base { type: string }
          interface TrainingIntent extends Base { type: "training" }
          interface FutureIntent extends Base { type: "future_action" }
          interface NotAnIntent { type: "noise" }
          type AnyIntent = TrainingIntent | FutureIntent;
        `,
        family: "intent",
      },
    ]);

    expect(contracts).toEqual(expect.arrayContaining(["future_action", "training"]));
    expect(contracts).not.toContain("noise");
  });

  it("covers the complete production intent union without a stale count", () => {
    const audit = runCapabilityAudit(ROOT);
    expect(audit.intents.all.length).toBeGreaterThan(0);
    expect(new Set(audit.intents.all).size).toBe(audit.intents.all.length);
    expect(audit.intents.unhandled).toEqual([]);
  });

  it("covers every registered phase through the authoritative registry", () => {
    const audit = runCapabilityAudit(ROOT);
    expect(audit.phases.registered).toEqual(GAME_PIPELINE_PHASES.map((phase) => phase.name));
    expect(audit.phases.undescribed).toEqual([]);
    expect(audit.phases.unregisteredDescriptors).toEqual([]);
  });

  it("reports player, NPC, validation, and resolution coverage separately", () => {
    const audit = runCapabilityAudit(ROOT);
    const raceEntry = audit.intents.byType.race_entry;
    expect(raceEntry.playerProduced).toBe(true);
    expect(raceEntry.npcProduced).toBe(true);
    expect(raceEntry.validated).toBe(true);
    expect(raceEntry.resolved).toBe(true);
  });

  it("assigns every impact contract to exactly one registered handler", () => {
    const audit = runCapabilityAudit(ROOT);
    const duplicates: string[] = [];
    const missing: string[] = [];
    for (const impactType of audit.impacts.all) {
      const handlers = ALL_HANDLERS.filter((handler) => handler.canHandle(impactType));
      if (handlers.length === 0) missing.push(impactType);
      if (handlers.length > 1) duplicates.push(impactType);
    }
    expect({ missing, duplicates }).toEqual({ missing: [], duplicates: [] });
  });

  it("requires an explicit typed waiver for every asymmetric or system-only intent", () => {
    const audit = runCapabilityAudit(ROOT);
    const asymmetric = new Set([
      ...audit.intents.playerOnly,
      ...audit.intents.npcOnly,
      ...audit.intents.systemOnly,
    ]);
    const missing = [...asymmetric].filter(
      (type) => !INTENT_CAPABILITY_WAIVERS[type as keyof typeof INTENT_CAPABILITY_WAIVERS],
    );
    const invalid = Object.keys(INTENT_CAPABILITY_WAIVERS).filter(
      (type) => !audit.intents.all.includes(type as never),
    );
    expect({ missing, invalid }).toEqual({ missing: [], invalid: [] });
  });
});
