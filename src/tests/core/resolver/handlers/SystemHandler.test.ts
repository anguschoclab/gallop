import { describe, it, expect } from "vitest";
import { SystemHandler } from "@/core/resolver/handlers/SystemHandler";
import type { GameState } from "@/game/store/state";
import type {
  LogImpact,
  TransactionImpact,
  CampaignCreationImpact,
  CampaignFlagDismissalImpact,
} from "@/core/resolver/impacts/index";

describe("SystemHandler", () => {
  it("log pushes entry to draft.log", () => {
    const handler = new SystemHandler();
    const state = { log: [], horses: {} } as unknown as GameState;

    const impact: LogImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "log",
      text: "Something happened",
      reason: "Log entry",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.log).toHaveLength(1);
    expect(draft.log[0].text).toBe("Something happened");
    expect(draft.log[0].day).toBe(10);
  });

  it("transaction creates a transaction entry with correct type", () => {
    const handler = new SystemHandler();
    const state = { cash: 1000, transactions: [], horses: {} } as unknown as GameState;

    const impact: TransactionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "raceResolution",
      logLevel: "always",
      type: "transaction",
      amount: 500,
      category: "prize_money",
      description: "Race winnings",
      reason: "Transaction",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.transactions).toHaveLength(1);
    expect(draft.transactions[0].amount).toBe(500);
    expect(draft.transactions[0].type).toBe("income");
  });

  it("transaction with negative amount creates expense type", () => {
    const handler = new SystemHandler();
    const state = { cash: 1000, transactions: [], horses: {} } as unknown as GameState;

    const impact: TransactionImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "transaction",
      amount: -200,
      category: "entry_fee",
      description: "Race entry fee",
      reason: "Transaction",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.transactions).toHaveLength(1);
    expect(draft.transactions[0].type).toBe("expense");
  });

  it("campaign_creation creates a new campaign from horseId+goalType — regression test for shape fix", () => {
    const handler = new SystemHandler();
    const state = { horses: {}, campaigns: [] } as unknown as GameState;

    const impact: CampaignCreationImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "campaign_creation",
      horseId: "horse-1",
      goalType: "chase_g1",
      targetRaceKey: "race-123",
      reason: "Campaign created",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.campaigns).toHaveLength(1);
    expect(draft.campaigns[0].horseId).toBe("horse-1");
    expect(draft.campaigns[0].goalType).toBe("chase_g1");
    expect(draft.campaigns[0].targetRaceKey).toBe("race-123");
    expect(draft.campaigns[0].slots).toEqual([]);
    expect(draft.campaigns[0].flags).toEqual([]);
    expect(draft.campaigns[0].autoManaged).toBe(false);
    expect(draft.campaigns[0].createdDay).toBe(10);
  });

  it("campaign_flag_dismissal with flagIndex removes flag by index — regression test for shape fix", () => {
    const handler = new SystemHandler();
    const state = {
      horses: {},
      campaigns: [
        {
          horseId: "horse-1",
          goalType: "chase_g1",
          slots: [],
          flags: [
            { day: 5, type: "poor_form", message: "Bad race", dismissed: false },
            { day: 8, type: "low_energy", message: "Tired", dismissed: false },
          ],
          autoManaged: false,
          confirmedAptitudes: {
            surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
            distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
          },
          createdDay: 1,
          lastReviewedDay: 1,
        },
      ],
    } as unknown as GameState;

    const impact: CampaignFlagDismissalImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "campaign_flag_dismissal",
      horseId: "horse-1",
      flagIndex: 0,
      reason: "Flag dismissed",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.campaigns[0].flags).toHaveLength(1);
    expect(draft.campaigns[0].flags[0].type).toBe("low_energy");
  });

  it("campaign_flag_dismissal with flag object removes matching flag", () => {
    const handler = new SystemHandler();
    const state = {
      horses: {},
      campaigns: [
        {
          horseId: "horse-1",
          goalType: "chase_g1",
          slots: [],
          flags: [
            { day: 5, type: "poor_form", message: "Bad race", dismissed: false },
            { day: 8, type: "low_energy", message: "Tired", dismissed: false },
          ],
          autoManaged: false,
          confirmedAptitudes: {
            surfaceStarts: { Turf: 0, Dirt: 0, Synthetic: 0 },
            distanceBandStarts: { sprint: 0, mile: 0, intermediate: 0, staying: 0 },
          },
          createdDay: 1,
          lastReviewedDay: 1,
        },
      ],
    } as unknown as GameState;

    const impact: CampaignFlagDismissalImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "campaign_flag_dismissal",
      horseId: "horse-1",
      flag: { day: 5, type: "poor_form", message: "Bad race", dismissed: false },
      reason: "Flag dismissed",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.campaigns[0].flags).toHaveLength(1);
    expect(draft.campaigns[0].flags[0].type).toBe("low_energy");
  });

  it("claimResolution should NOT be handled — regression test for canHandle fix", () => {
    const handler = new SystemHandler();
    expect(handler.canHandle("claimResolution")).toBe(false);
  });

  it("canHandle returns true for known impact types", () => {
    const handler = new SystemHandler();
    expect(handler.canHandle("log")).toBe(true);
    expect(handler.canHandle("transaction")).toBe(true);
    expect(handler.canHandle("horse_deletion")).toBe(false);
    expect(handler.canHandle("campaign_creation")).toBe(true);
    expect(handler.canHandle("reputation_change")).toBe(true);
    expect(handler.canHandle("news_item")).toBe(true);
    expect(handler.canHandle("unknown_type")).toBe(false);
  });
});
