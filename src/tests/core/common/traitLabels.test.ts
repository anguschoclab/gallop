import { describe, it, expect } from "vitest";
import {
  formatJockeyTrait,
  JOCKEY_TRAIT_OPTIONS,
  formatStaffTrait,
  STAFF_TRAIT_OPTIONS,
  HORSE_TRAIT_CATEGORY_OPTIONS,
  HORSE_TRAIT_OPTIONS,
  getHorseTraitValue,
  type HorseTraitKey,
} from "@/core/common/traitLabels";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { createTestGenotype } from "@/tests/helpers/createTestGenotype";

describe("traitLabels — jockey traits", () => {
  it("formatJockeyTrait: gate_master → Gate Master", () => {
    expect(formatJockeyTrait("gate_master")).toBe("Gate Master");
  });

  it("formatJockeyTrait: bullring_expert → Bullring Expert", () => {
    expect(formatJockeyTrait("bullring_expert")).toBe("Bullring Expert");
  });

  it("formatJockeyTrait: hill_specialist → Hill Specialist", () => {
    expect(formatJockeyTrait("hill_specialist")).toBe("Hill Specialist");
  });

  it("formatJockeyTrait: long_straight_pro → Long Straight Pro", () => {
    expect(formatJockeyTrait("long_straight_pro")).toBe("Long Straight Pro");
  });

  it("JOCKEY_TRAIT_OPTIONS has 14 entries (all + 13 traits)", () => {
    expect(JOCKEY_TRAIT_OPTIONS).toHaveLength(14);
  });

  it("JOCKEY_TRAIT_OPTIONS first entry is the 'all' sentinel", () => {
    expect(JOCKEY_TRAIT_OPTIONS[0].value).toBe("all");
  });

  it("JOCKEY_TRAIT_OPTIONS contains all 13 jockey traits", () => {
    const values = JOCKEY_TRAIT_OPTIONS.map((o) => o.value);
    expect(values).toContain("gate_master");
    expect(values).toContain("bullring_expert");
    expect(values).toContain("hill_specialist");
    expect(values).toContain("long_straight_pro");
    expect(values).toContain("turf_specialist");
    expect(values).toContain("dirt_specialist");
    expect(values).toContain("mud_master");
    expect(values).toContain("sprint_specialist");
    expect(values).toContain("staying_specialist");
    expect(values).toContain("pace_presser");
    expect(values).toContain("big_match_temperament");
    expect(values).toContain("veteran_poise");
    expect(values).toContain("closer_instinct");
  });

  it("formatJockeyTrait: turf_specialist → Turf Specialist", () => {
    expect(formatJockeyTrait("turf_specialist")).toBe("Turf Specialist");
  });

  it("formatJockeyTrait: dirt_specialist → Dirt Specialist", () => {
    expect(formatJockeyTrait("dirt_specialist")).toBe("Dirt Specialist");
  });

  it("formatJockeyTrait: mud_master → Mud Master", () => {
    expect(formatJockeyTrait("mud_master")).toBe("Mud Master");
  });

  it("formatJockeyTrait: sprint_specialist → Sprint Specialist", () => {
    expect(formatJockeyTrait("sprint_specialist")).toBe("Sprint Specialist");
  });

  it("formatJockeyTrait: staying_specialist → Staying Specialist", () => {
    expect(formatJockeyTrait("staying_specialist")).toBe("Staying Specialist");
  });

  it("formatJockeyTrait: pace_presser → Pace Presser", () => {
    expect(formatJockeyTrait("pace_presser")).toBe("Pace Presser");
  });

  it("formatJockeyTrait: big_match_temperament → Big Match Temperament", () => {
    expect(formatJockeyTrait("big_match_temperament")).toBe("Big Match Temperament");
  });

  it("formatJockeyTrait: veteran_poise → Veteran Poise", () => {
    expect(formatJockeyTrait("veteran_poise")).toBe("Veteran Poise");
  });

  it("formatJockeyTrait: closer_instinct → Closer Instinct", () => {
    expect(formatJockeyTrait("closer_instinct")).toBe("Closer Instinct");
  });
});

describe("traitLabels — staff traits", () => {
  it("formatStaffTrait: colic_expert → Colic Expert", () => {
    expect(formatStaffTrait("colic_expert")).toBe("Colic Expert");
  });

  it("formatStaffTrait: speed_coach → Speed Coach", () => {
    expect(formatStaffTrait("speed_coach")).toBe("Speed Coach");
  });

  it("formatStaffTrait: durability_focus → Durability Focus", () => {
    expect(formatStaffTrait("durability_focus")).toBe("Durability Focus");
  });

  it("STAFF_TRAIT_OPTIONS first entry is the 'all' sentinel", () => {
    expect(STAFF_TRAIT_OPTIONS[0].value).toBe("all");
  });

  it("STAFF_TRAIT_OPTIONS contains traits from all 5 roles", () => {
    const values = STAFF_TRAIT_OPTIONS.map((o) => o.value);
    // veterinarian
    expect(values).toContain("colic_expert");
    expect(values).toContain("bone_specialist");
    // farrier
    expect(values).toContain("mud_expert");
    expect(values).toContain("turf_specialist");
    // nutritionist
    expect(values).toContain("stamina_optimizer");
    expect(values).toContain("recovery_plus");
    // groom
    expect(values).toContain("show_prep");
    expect(values).toContain("vibe_check");
    // trainer
    expect(values).toContain("speed_coach");
    expect(values).toContain("distance_guru");
    expect(values).toContain("gate_expert");
    expect(values).toContain("discipline_master");
  });

  it("STAFF_TRAIT_OPTIONS has 21 entries (all + 20 unique traits)", () => {
    expect(STAFF_TRAIT_OPTIONS).toHaveLength(21);
  });
});

describe("traitLabels — horse trait categories", () => {
  it("HORSE_TRAIT_CATEGORY_OPTIONS first entry is the 'all' sentinel", () => {
    expect(HORSE_TRAIT_CATEGORY_OPTIONS[0].value).toBe("all");
  });

  it("HORSE_TRAIT_CATEGORY_OPTIONS contains all 7 trait keys", () => {
    const values = HORSE_TRAIT_CATEGORY_OPTIONS.map((o) => o.value);
    expect(values).toContain("runningStyle");
    expect(values).toContain("fiberBias");
    expect(values).toContain("strideType");
    expect(values).toContain("trackPreference");
    expect(values).toContain("weatherPreference");
    expect(values).toContain("temperament");
    expect(values).toContain("constitution");
  });

  it("HORSE_TRAIT_OPTIONS for runningStyle has 'all' sentinel + 4 styles", () => {
    const opts = HORSE_TRAIT_OPTIONS.runningStyle;
    expect(opts[0].value).toBe("all");
    const values = opts.map((o) => o.value);
    expect(values).toContain("E");
    expect(values).toContain("EP");
    expect(values).toContain("P");
    expect(values).toContain("S");
  });

  it("HORSE_TRAIT_OPTIONS for fiberBias has 'all' + sprinter/balanced/stayer", () => {
    const opts = HORSE_TRAIT_OPTIONS.fiberBias;
    expect(opts[0].value).toBe("all");
    const values = opts.map((o) => o.value);
    expect(values).toContain("sprinter");
    expect(values).toContain("balanced");
    expect(values).toContain("stayer");
  });

  it("HORSE_TRAIT_OPTIONS for temperament has 'all' + excellent/good/fair/poor", () => {
    const opts = HORSE_TRAIT_OPTIONS.temperament;
    expect(opts[0].value).toBe("all");
    const values = opts.map((o) => o.value);
    expect(values).toContain("excellent");
    expect(values).toContain("good");
    expect(values).toContain("fair");
    expect(values).toContain("poor");
  });
});

describe("traitLabels — getHorseTraitValue", () => {
  it("returns runningStyle from horse", () => {
    const horse = createTestHorse({ runningStyle: "E" });
    expect(getHorseTraitValue(horse, "runningStyle")).toBe("E");
  });

  it("returns fiberBias from horse", () => {
    const horse = createTestHorse({ fiberBias: "sprinter" });
    expect(getHorseTraitValue(horse, "fiberBias")).toBe("sprinter");
  });

  it("returns strideType from horse", () => {
    const horse = createTestHorse({ strideType: "long" });
    expect(getHorseTraitValue(horse, "strideType")).toBe("long");
  });

  it("returns trackPreference from horse", () => {
    const horse = createTestHorse({ trackPreference: "left" });
    expect(getHorseTraitValue(horse, "trackPreference")).toBe("left");
  });

  it("returns weatherPreference from horse", () => {
    const horse = createTestHorse({ weatherPreference: "dry" });
    expect(getHorseTraitValue(horse, "weatherPreference")).toBe("dry");
  });

  it("returns 'all' for undefined weatherPreference", () => {
    const horse = createTestHorse({ weatherPreference: undefined });
    expect(getHorseTraitValue(horse, "weatherPreference")).toBe("all");
  });

  it("returns resolved temperament rating from genotype.mental", () => {
    // mental locus [5,5] → sum=10 → excellent
    const horse = createTestHorse({
      genotype: createTestGenotype({ mental: [5, 5] as [number, number] }),
    });
    expect(getHorseTraitValue(horse, "temperament")).toBe("excellent");
  });

  it("returns resolved constitution rating from genotype.physical", () => {
    // physical locus [1,1] → sum=2 → poor
    const horse = createTestHorse({
      genotype: createTestGenotype({ physical: [1, 1] as [number, number] }),
    });
    expect(getHorseTraitValue(horse, "constitution")).toBe("poor");
  });

  it("returns 'good' for temperament when mental sum is 7", () => {
    // mental locus [4,3] → sum=7 → good
    const horse = createTestHorse({
      genotype: createTestGenotype({ mental: [4, 3] as [number, number] }),
    });
    expect(getHorseTraitValue(horse, "temperament")).toBe("good");
  });

  it("returns 'fair' for constitution when physical sum is 4", () => {
    // physical locus [2,2] → sum=4 → fair
    const horse = createTestHorse({
      genotype: createTestGenotype({ physical: [2, 2] as [number, number] }),
    });
    expect(getHorseTraitValue(horse, "constitution")).toBe("fair");
  });
});
