import { describe, it, expect } from "vitest";
import { ALL_HANDLERS } from "@/platform/resolver/handlers";

const KNOWN_TYPES: Record<string, string[]> = {
  HorseHandler: ["horse_stat_change", "injury", "energy_change"],
  FinanceHandler: ["cash_change", "horse_transfer", "transaction"],
  RacingHandler: ["race_entry", "claiming", "jockey_assignment"],
  BreedingHandler: ["pregnancy_creation", "stud_career", "update_stud_fee"],
  MarketHandler: ["scout_report", "consignment", "auction_resolution"],
  SystemHandler: ["log"],
  InfrastructureHandler: ["facility_upgrade", "staff", "outpost_action"],
  SyndicationHandler: ["syndicate_creation"],
  InboxHandler: ["inbox_message"],
  DiplomacyHandler: ["diplomatic", "cartel"],
};

const FORBIDDEN_TYPES = [
  "toString",
  "constructor",
  "hasOwnProperty",
  "__proto__",
  "valueOf",
  "bogus_impact_type",
];

describe("ImpactHandler.canHandle dispatch contract", () => {
  it("covers all registered handlers in this spec", () => {
    for (const handler of ALL_HANDLERS) {
      expect(KNOWN_TYPES).toHaveProperty(handler.constructor.name);
    }
  });

  it("each handler accepts its registered impact types", () => {
    for (const handler of ALL_HANDLERS) {
      for (const type of KNOWN_TYPES[handler.constructor.name]) {
        expect(handler.canHandle(type), `${handler.constructor.name} should handle ${type}`).toBe(
          true,
        );
      }
    }
  });

  it("each handler rejects unknown and prototype-inherited type names", () => {
    for (const handler of ALL_HANDLERS) {
      for (const type of FORBIDDEN_TYPES) {
        expect(handler.canHandle(type), `${handler.constructor.name} must reject ${type}`).toBe(
          false,
        );
      }
    }
  });

  it("no handler claims a type owned by another handler", () => {
    const seen = new Map<string, string>();
    for (const handler of ALL_HANDLERS) {
      for (const type of KNOWN_TYPES[handler.constructor.name]) {
        const owner = seen.get(type);
        if (owner) {
          throw new Error(`${type} claimed by both ${owner} and ${handler.constructor.name}`);
        }
        if (handler.canHandle(type)) {
          seen.set(type, handler.constructor.name);
        }
      }
    }
  });
});
