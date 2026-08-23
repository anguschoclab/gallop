import { describe, it, expect } from "vitest";
import { BreedingHandler } from "@/core/resolver/handlers/BreedingHandler";
import type { GameState } from "@/game/store/state";
import type {
  UpdateStudFeeImpact,
  StudCareerImpact,
  PregnancyCreationImpact,
  PregnancyUpdateImpact,
  PregnancyDeletionImpact,
  MareFoalingUpdateImpact,
} from "@/core/resolver/impacts/index";
import type { BlueHenImpact } from "@/core/resolver/impacts/index";
import { h2r, r2r } from "@/tests/helpers/sampleGameState";

describe("BreedingHandler", () => {
  it("update_stud_fee sets horse.stud.standingFee", () => {
    const handler = new BreedingHandler();
    const state = {
      horses: h2r([
        { id: "horse-1", name: "Star", stud: { standingFee: 5000, atStud: true } },
      ] as unknown as Horse[]),
      pregnancies: [],
    } as unknown as GameState;

    const impact: UpdateStudFeeImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "update_stud_fee",
      horseId: "horse-1",
      newFee: 7500,
      reason: "Stud fee updated",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].stud.standingFee).toBe(7500);
  });

  it("update_stud_fee does nothing if horse has no stud career", () => {
    const handler = new BreedingHandler();
    const state = {
      horses: h2r([{ id: "horse-1", name: "Star" }] as unknown as Horse[]),
      pregnancies: [],
    } as unknown as GameState;

    const impact: UpdateStudFeeImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "update_stud_fee",
      horseId: "horse-1",
      newFee: 7500,
      reason: "Stud fee updated",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].stud).toBeUndefined();
  });

  it("stud_career sets horse.stud", () => {
    const handler = new BreedingHandler();
    const state = {
      horses: h2r([{ id: "horse-1", name: "Star" }] as unknown as Horse[]),
      pregnancies: [],
    } as unknown as GameState;

    const studCareer = {
      atStud: true,
      standingFee: 10000,
      bookSize: 40,
      seasonBookings: 0,
      lifetimeFoals: 0,
      lifetimeStakesFoals: 0,
      lifetimeG1Foals: 0,
    };

    const impact: StudCareerImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "managementResolution",
      logLevel: "always",
      type: "stud_career",
      horseId: "horse-1",
      studCareer,
      reason: "Retired to stud",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].stud).toEqual(studCareer);
  });

  it("pregnancy_creation pushes pregnancy to draft.pregnancies", () => {
    const handler = new BreedingHandler();
    const state = { horses: {}, pregnancies: [] } as unknown as GameState;

    const pregnancy = {
      id: "preg-1",
      sireId: asHorseId("horse-2"),
      damId: asHorseId("horse-1"),
      sireName: "Sire",
      damName: "Star",
      conceivedDay: 10,
      dueDay: 335,
      resolved: false,
      isPlayerOwned: true,
    } as unknown as Pregnancy;

    const impact: PregnancyCreationImpact = {
      id: "imp-1",
      intentId: "",
      day: 10,
      phase: "breedingResolution",
      logLevel: "always",
      type: "pregnancy_creation",
      pregnancy,
      reason: "Pregnancy confirmed",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.pregnancies).toHaveLength(1);
    expect(draft.pregnancies[0].id).toBe("preg-1");
  });

  it("pregnancy_update updates existing pregnancy", () => {
    const handler = new BreedingHandler();
    const state = {
      horses: {},
      pregnancies: [
        {
          id: "preg-1",
          sireId: "h2",
          damId: "h1",
          sireName: "S",
          damName: "D",
          conceivedDay: 10,
          dueDay: 335,
          resolved: false,
          isPlayerOwned: true,
        },
      ],
    } as unknown as GameState;

    const impact: PregnancyUpdateImpact = {
      id: "imp-1",
      intentId: "",
      day: 20,
      phase: "breedingResolution",
      logLevel: "always",
      type: "pregnancy_update",
      pregnancyId: "preg-1",
      updates: { stage: "mid" },
      reason: "Pregnancy progressing",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.pregnancies[0].stage).toBe("mid");
  });

  it("pregnancy_deletion removes pregnancy", () => {
    const handler = new BreedingHandler();
    const state = {
      horses: {},
      pregnancies: [
        {
          id: "preg-1",
          sireId: "h2",
          damId: "h1",
          sireName: "S",
          damName: "D",
          conceivedDay: 10,
          dueDay: 335,
          resolved: false,
          isPlayerOwned: true,
        },
        {
          id: "preg-2",
          sireId: "h4",
          damId: "h3",
          sireName: "S",
          damName: "D",
          conceivedDay: 10,
          dueDay: 335,
          resolved: false,
          isPlayerOwned: true,
        },
      ],
    } as unknown as GameState;

    const impact: PregnancyDeletionImpact = {
      id: "imp-1",
      intentId: "",
      day: 20,
      phase: "breedingResolution",
      logLevel: "always",
      type: "pregnancy_deletion",
      pregnancyId: "preg-1",
      reason: "Pregnancy lost",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.pregnancies).toHaveLength(1);
    expect(draft.pregnancies[0].id).toBe("preg-2");
  });

  it("mare_foaling_update sets fields on horse", () => {
    const handler = new BreedingHandler();
    const state = {
      horses: h2r([{ id: "horse-1", name: "Star" }] as unknown as Horse[]),
      pregnancies: [],
    } as unknown as GameState;

    const impact: MareFoalingUpdateImpact = {
      id: "imp-1",
      intentId: "",
      day: 30,
      phase: "breedingResolution",
      logLevel: "always",
      type: "mare_foaling_update",
      horseId: "horse-1",
      lastFoaledDay: 30,
      foalsProduced: ["foal-1", "foal-2", "foal-3", "foal-4", "foal-5"],
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 2,
        group1WinnersProduced: 2,
        blueHenScore: 50,
        foalsProduced: 5,
      },
      reason: "Mare foaled",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].lastFoaledDay).toBe(30);
    expect(draft.horses["horse-1"].foalsProduced).toEqual([
      "foal-1",
      "foal-2",
      "foal-3",
      "foal-4",
      "foal-5",
    ]);
    expect(draft.horses["horse-1"].blueHenStatus).toEqual({
      isBlueHen: true,
      stakesWinnersProduced: 2,
      group1WinnersProduced: 2,
      blueHenScore: 50,
      foalsProduced: 5,
    });
  });

  it("blue_hen_status (underscore) updates horse.blueHenStatus — regression test for type string fix", () => {
    const handler = new BreedingHandler();
    const state = {
      horses: h2r([{ id: "horse-1", name: "Star" }] as unknown as Horse[]),
      pregnancies: [],
    } as unknown as GameState;

    const impact: BlueHenImpact = {
      id: "imp-1",
      intentId: "",
      day: 30,
      phase: "breedingResolution",
      logLevel: "always",
      type: "blue_hen_status",
      horseId: "horse-1",
      blueHenStatus: {
        isBlueHen: true,
        stakesWinnersProduced: 3,
        group1WinnersProduced: 3,
        blueHenScore: 75,
        foalsProduced: 5,
      },
      reason: "Blue hen status updated",
    };

    const draft = JSON.parse(JSON.stringify(state));
    handler.handle(draft, impact);

    expect(draft.horses["horse-1"].blueHenStatus).toEqual({
      isBlueHen: true,
      stakesWinnersProduced: 3,
      group1WinnersProduced: 3,
      blueHenScore: 75,
      foalsProduced: 5,
    });
  });

  it("canHandle returns true for all breeding impact types", () => {
    const handler = new BreedingHandler();
    expect(handler.canHandle("update_stud_fee")).toBe(true);
    expect(handler.canHandle("pregnancy_creation")).toBe(true);
    expect(handler.canHandle("pregnancy_update")).toBe(true);
    expect(handler.canHandle("pregnancy_deletion")).toBe(true);
    expect(handler.canHandle("stud_career")).toBe(true);
    expect(handler.canHandle("mare_foaling_update")).toBe(true);
    expect(handler.canHandle("blue_hen_status")).toBe(true);
    expect(handler.canHandle("cash_change")).toBe(false);
  });
});
import type { Horse } from "@/game/types";
