import { describe, it, expect } from "vitest";
import { deriveFoalInheritance } from "@/core/horse/foal-inheritance";
import type { Horse } from "@/core/horse/types";

function horseWith(stats: Partial<Record<"speed" | "stamina" | "acceleration" | "consistency", number>>): Horse {
  return {
    stats: {
      speed: stats.speed ?? 50,
      stamina: stats.stamina ?? 50,
      acceleration: stats.acceleration ?? 50,
      consistency: stats.consistency ?? 50,
      temperament: 50,
      conformation: 50,
    },
  } as Horse;
}

describe("deriveFoalInheritance", () => {
  it("attributes each stat toward the closer parent", () => {
    const sire = horseWith({ speed: 90, stamina: 40 });
    const dam = horseWith({ speed: 50, stamina: 80 });
    const foal = horseWith({ speed: 85, stamina: 78 });

    const rows = deriveFoalInheritance(foal, sire, dam);
    const speed = rows.find((r) => r.key === "speed")!;
    const stamina = rows.find((r) => r.key === "stamina")!;

    expect(speed.leansToward).toBe("sire");
    expect(stamina.leansToward).toBe("dam");
    expect(speed.foal).toBe(85);
    expect(speed.sire).toBe(90);
    expect(speed.dam).toBe(50);
  });

  it("marks a stat that exceeds both parents as 'transgressive'", () => {
    const sire = horseWith({ acceleration: 60 });
    const dam = horseWith({ acceleration: 65 });
    const foal = horseWith({ acceleration: 80 });

    const rows = deriveFoalInheritance(foal, sire, dam);
    expect(rows.find((r) => r.key === "acceleration")!.leansToward).toBe("transgressive");
  });

  it("returns an empty array when a parent is missing", () => {
    const foal = horseWith({});
    expect(deriveFoalInheritance(foal, undefined, undefined)).toEqual([]);
  });
});
