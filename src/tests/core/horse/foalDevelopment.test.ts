import { describe, it, expect } from "vitest";
import { createDefaultFoalDevelopmentArc } from "@/core/horse/foalDevelopment";
import { FOAL_BREAKING_IN_DAY, FOAL_EARLY_WORKOUTS_DAY } from "@/constants";

describe("createDefaultFoalDevelopmentArc", () => {
  it("creates an arc with two pending milestones", () => {
    const arc = createDefaultFoalDevelopmentArc(10);
    expect(arc.milestones).toHaveLength(2);
    expect(arc.milestones[0].key).toBe("breaking_in");
    expect(arc.milestones[1].key).toBe("early_workouts");
    expect(arc.milestones[0].status).toBe("pending");
    expect(arc.milestones[1].status).toBe("pending");
  });

  it("calculates trigger days relative to birthDay", () => {
    const birthDay = 100;
    const arc = createDefaultFoalDevelopmentArc(birthDay);

    const breakingIn = arc.milestones.find((m) => m.key === "breaking_in")!;
    const earlyWorkouts = arc.milestones.find((m) => m.key === "early_workouts")!;

    expect(breakingIn.triggerDay).toBe(birthDay + FOAL_BREAKING_IN_DAY);
    expect(earlyWorkouts.triggerDay).toBe(birthDay + FOAL_EARLY_WORKOUTS_DAY);
  });
});
