import { describe, it, expect } from "vitest";
import { canBreed, MARE_RECOVERY_DAYS } from "./eligibility";
import type { Horse, Pregnancy } from "@/game/types";

function mkHorse(overrides: Partial<Horse> = {}): Horse {
  return {
    id: overrides.id ?? "x",
    name: overrides.name ?? "Test",
    age: 4,
    gender: "horse",
    hemisphere: "Northern",
    silk: "#abcdef",
    stats: { speed: 60, stamina: 60, acceleration: 60, consistency: 60 },
    energy: 100,
    form: 0,
    potential: 80,
    raceHistory: [],
    owned: true,
    fame: 0,
    ...overrides,
  };
}

const sire = mkHorse({ id: "sire", name: "Sire", gender: "horse", age: 5 });
const dam = mkHorse({ id: "dam", name: "Dam", gender: "mare", age: 5 });

describe("canBreed", () => {
  it("accepts a healthy compatible pair", () => {
    expect(canBreed(sire, dam, 100, [])).toEqual({ ok: true });
  });

  it("rejects same horse breeding itself", () => {
    expect(canBreed(sire, sire, 100, [])).toMatchObject({ ok: false });
  });

  it("rejects same-sex pair", () => {
    const otherSire = mkHorse({ id: "s2", name: "Other Sire", gender: "horse" });
    const r = canBreed(sire, otherSire as Horse, 100, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/female|male/i);
  });

  it("rejects underage horses", () => {
    const young = mkHorse({ id: "y", gender: "filly", age: 2 });
    const r = canBreed(sire, young, 100, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/young/i);
  });

  it("rejects mare past breeding age", () => {
    const old = mkHorse({ id: "old", gender: "mare", age: 25 });
    const r = canBreed(sire, old, 100, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/breeding age/i);
  });

  it("rejects already-pregnant mare", () => {
    const preg: Pregnancy = {
      id: "p1",
      sireId: "anyone",
      damId: "dam",
      sireName: "Any",
      damName: "Dam",
      conceivedDay: 50,
      dueDay: 80,
      resolved: false,
    };
    const r = canBreed(sire, dam, 100, [preg]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/pregnant/i);
  });

  it("rejects mare still recovering from foaling", () => {
    const recovering = mkHorse({ id: "dam2", gender: "mare", lastFoaledDay: 80 });
    const r = canBreed(sire, recovering, 80 + MARE_RECOVERY_DAYS - 5, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/recovering/i);
  });

  it("accepts mare past recovery period", () => {
    const recovered = mkHorse({ id: "dam2", gender: "mare", lastFoaledDay: 50 });
    expect(canBreed(sire, recovered, 50 + MARE_RECOVERY_DAYS, []).ok).toBe(true);
  });

  it("rejects covering-sickness parent", () => {
    const sick = mkHorse({ id: "sick", gender: "mare", healthStatus: "covering_sickness" });
    const r = canBreed(sire, sick, 100, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/covering sickness|dourine/i);
  });

  it("rejects parent-child via name match", () => {
    const offspring = mkHorse({ id: "kid", gender: "mare", sireName: "Sire" });
    const r = canBreed(sire, offspring, 100, []);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/parent/i);
  });
});
