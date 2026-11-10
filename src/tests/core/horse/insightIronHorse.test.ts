import { describe, it, expect } from "vitest";
import { detectIronHorse } from "@/domains/horse/simulation/insightDetectors";
import type { Horse } from "@/domains/horse/simulation/types";

describe("detectIronHorse", () => {
  it("detects Iron Horse for horses with 20+ starts", () => {
    const horse = {
      careerStarts: 21,
    } as Horse;
    const insight = detectIronHorse(horse);
    expect(insight?.label).toBe("Iron Horse");
    expect(insight?.value).toBe("Veteran Warrior");
    expect(insight?.type).toBe("positive");
    expect(insight?.context).toBe("Has made 21 career trips to the starting gate");
  });

  it("returns null if starts are under 20", () => {
    const horse = {
      careerStarts: 19,
    } as Horse;
    expect(detectIronHorse(horse)).toBeNull();
  });
});
