import { describe, it, expect } from "vitest";
import { ageHorses, refreshMarket, pruneOldRaces } from "@/domains/market/simulation/marketRefresh";
import { createRng } from "@/shared/common/rng";
import type { Horse, Race } from "@/platform/game/types";

describe("marketRefresh", () => {
  describe("ageHorses", () => {
    it("should age Northern hemisphere horses on day 1", () => {
      const h: Horse = {
        id: "1",
        name: "H1",
        age: 2,
        gender: "colt",
        hemisphere: "Northern",
      } as any;
      const res = ageHorses([h], 1);
      expect(res[0].age).toBe(3);
      expect(res[0].gender).toBe("horse");
    });

    it("should age Southern hemisphere horses on day 213", () => {
      const h: Horse = {
        id: "1",
        name: "H1",
        age: 2,
        gender: "filly",
        hemisphere: "Southern",
      } as any;
      const res = ageHorses([h], 213);
      expect(res[0].age).toBe(3);
      expect(res[0].gender).toBe("mare");
    });

    it("should not age on other days", () => {
      const h: Horse = {
        id: "1",
        name: "H1",
        age: 2,
        gender: "colt",
        hemisphere: "Northern",
      } as any;
      const res = ageHorses([h], 2);
      expect(res[0].age).toBe(2);
      expect(res[0].gender).toBe("colt");
    });
  });

  describe("refreshMarket", () => {
    it("should maintain 5 horses", () => {
      const rng = createRng("test");
      const market = refreshMarket([], rng);
      expect(market.length).toBe(5);
    });

    it("should keep the 2 oldest horses when current market has more than 3", () => {
      const h1: Horse = { id: "1" } as any;
      const h2: Horse = { id: "2" } as any;
      const h3: Horse = { id: "3" } as any;
      const h4: Horse = { id: "4" } as any;
      const market = refreshMarket([h1, h2, h3, h4], createRng("test"));
      expect(market[0].id).toBe("3");
      expect(market[1].id).toBe("4");
      expect(market.length).toBe(5);
    });
  });

  describe("pruneOldRaces", () => {
    it("should prune resolved ungraded races older than 30 days", () => {
      const races: Race[] = [
        { id: "1", day: 10, resolved: true, graded: false } as any, // remove
        { id: "2", day: 30, resolved: true, graded: false } as any, // keep
      ];
      const pruned = pruneOldRaces(races, 50);
      expect(pruned.length).toBe(1);
      expect(pruned[0].id).toBe("2");
    });

    it("should prune resolved graded races older than 365 days", () => {
      const races: Race[] = [
        { id: "1", day: 10, resolved: true, graded: true } as any, // remove
        { id: "2", day: 100, resolved: true, graded: true } as any, // keep
      ];
      const pruned = pruneOldRaces(races, 400);
      expect(pruned.length).toBe(1);
      expect(pruned[0].id).toBe("2");
    });

    it("should keep unresolved or cancelled races regardless of age", () => {
      const races: Race[] = [
        { id: "1", day: 10, resolved: false, cancelled: false, graded: false } as any,
        { id: "2", day: 10, resolved: false, cancelled: true, graded: false } as any,
      ];
      const pruned = pruneOldRaces(races, 100);
      expect(pruned.length).toBe(1);
      expect(pruned[0].id).toBe("1");
    });
  });
});
