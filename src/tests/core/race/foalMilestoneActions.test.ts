import { describe, it, expect } from "vitest";
import {
  validateMilestoneResolution,
  applyMilestoneChoice,
  buildMilestoneLogText,
} from "@/core/race/foalMilestoneActions";
import type { Horse } from "@/game/types";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";

function mockHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: "h1",
    name: "Test Horse",
    ownership: makePlayerOwned(),
    stats: {
      speed: 50,
      stamina: 50,
      acceleration: 50,
      consistency: 50,
      conformation: 50,
      temperament: 50,
    },
    developmentArc: {
      milestones: [
        {
          key: "m1",
          label: "Milestone 1",
          triggerDay: 10,
          status: "pending",
          choices: [
            {
              key: "c1",
              label: "Choice 1",
              description: "Desc",
              delta: { speed: 2, stamina: -1 },
            },
          ],
        },
        {
          key: "m2",
          label: "Milestone 2",
          triggerDay: 20,
          status: "resolved",
          resolvedChoiceKey: "c2",
          resolvedOnDay: 21,
          choices: [
            {
              key: "c2",
              label: "Choice 2",
              description: "Desc",
              delta: { acceleration: 2 },
            },
          ],
        },
      ],
    },
    ...overrides,
  } as Horse;
}

describe("foalMilestoneActions", () => {
  describe("validateMilestoneResolution", () => {
    it("returns null for a valid pending milestone and choice", () => {
      const horse = mockHorse();
      expect(validateMilestoneResolution(horse, "m1", "c1")).toBeNull();
    });

    it("returns error if horse is undefined", () => {
      expect(validateMilestoneResolution(undefined, "m1", "c1")).toBe("Horse not found.");
    });

    it("returns error if horse is not player owned", () => {
      const horse = mockHorse({ ownership: makeUnowned() });
      expect(validateMilestoneResolution(horse, "m1", "c1")).toBe("You do not own this horse.");
    });

    it("returns error if horse has no development arc", () => {
      const horse = mockHorse({ developmentArc: undefined });
      expect(validateMilestoneResolution(horse, "m1", "c1")).toBe("This horse has no development arc.");
    });

    it("returns error if milestone is not found", () => {
      const horse = mockHorse();
      expect(validateMilestoneResolution(horse, "invalid_m", "c1")).toBe("Milestone not found.");
    });

    it("returns error if milestone is already resolved", () => {
      const horse = mockHorse();
      expect(validateMilestoneResolution(horse, "m2", "c2")).toBe("Milestone already resolved.");
    });

    it("returns error if choice is not found", () => {
      const horse = mockHorse();
      expect(validateMilestoneResolution(horse, "m1", "invalid_c")).toBe("Choice not found.");
    });
  });

  describe("applyMilestoneChoice", () => {
    it("applies the stat deltas and updates the milestone status", () => {
      const horse = mockHorse();
      const choice = horse.developmentArc!.milestones[0].choices[0];
      const { nextStats, nextArc } = applyMilestoneChoice(horse, "m1", choice, 15);

      expect(nextStats.speed).toBe(52);
      expect(nextStats.stamina).toBe(49);
      expect(nextStats.acceleration).toBe(50); // unchanged

      const updatedMilestone = nextArc.milestones.find((m) => m.key === "m1");
      expect(updatedMilestone!.status).toBe("resolved");
      expect(updatedMilestone!.resolvedChoiceKey).toBe("c1");
      expect(updatedMilestone!.resolvedOnDay).toBe(15);
    });

    it("clamps stat increases at 100", () => {
      const horse = mockHorse({
        stats: {
          speed: 99,
          stamina: 50,
          acceleration: 50,
          consistency: 50,
          conformation: 50,
          temperament: 50,
        },
      });
      const choice = horse.developmentArc!.milestones[0].choices[0];
      const { nextStats } = applyMilestoneChoice(horse, "m1", choice, 15);

      expect(nextStats.speed).toBe(100);
    });

    it("clamps stat decreases at 0", () => {
      const horse = mockHorse({
        stats: {
          speed: 50,
          stamina: 0,
          acceleration: 50,
          consistency: 50,
          conformation: 50,
          temperament: 50,
        },
      });
      const choice = horse.developmentArc!.milestones[0].choices[0];
      const { nextStats } = applyMilestoneChoice(horse, "m1", choice, 15);

      expect(nextStats.stamina).toBe(0);
    });

    it("ignores undefined deltas", () => {
      const horse = mockHorse();
      const choice = {
        key: "c_partial",
        label: "Partial",
        description: "Desc",
        delta: { speed: 5, stamina: undefined },
      };
      const { nextStats } = applyMilestoneChoice(horse, "m1", choice, 15);
      expect(nextStats.speed).toBe(55);
      expect(nextStats.stamina).toBe(50);
    });
  });

  describe("buildMilestoneLogText", () => {
    it("formats the log text correctly", () => {
      const logText = buildMilestoneLogText("Silver Blaze", "Breaking In", "Bold Approach");
      expect(logText).toBe('Silver Blaze: Breaking In — chose "Bold Approach".');
    });
  });
});
