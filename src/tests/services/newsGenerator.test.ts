import { describe, it, expect } from "vitest";
import { generateRaceNews } from "@/services/newsGenerator";
import type { Race, Horse } from "@/game/types";

describe("newsGenerator", () => {
  it("should generate news for a G1 win", () => {
    const originalRandom = Math.random;
    Math.random = () => 0; // Always pick the first headline

    const race = {
      id: "race-1",
      name: "Kentucky Derby",
      graded: { grade: "G1" },
      raceClass: "Stakes",
    } as Race;

    const horses = [{ id: "horse-1", name: "Secretariat" }] as Horse[];

    const result = [{ horseId: "horse-1", position: 1 }];

    const news = generateRaceNews(race, result, horses, 10);
    expect(news).not.toBeNull();
    expect(news?.importance).toBe("high");
    expect(news?.headline).toContain("Secretariat");
    expect(news?.headline).toContain("Kentucky Derby");

    Math.random = originalRandom;
  });

  it("should NOT generate news for a maiden race", () => {
    const race = {
      id: "race-2",
      name: "Maiden Special Weight",
      raceClass: "Maiden",
    } as Race;

    const horses = [{ id: "horse-2", name: "Slow Joe" }] as Horse[];

    const result = [{ horseId: "horse-2", position: 1 }];

    const news = generateRaceNews(race, result, horses, 10);
    expect(news).toBeNull();
  });
});
