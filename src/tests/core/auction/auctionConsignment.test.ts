import { describe, it, expect } from "vitest";
import { personalityConsignmentPolicy } from "@/core/auction/auctionConsignment";
import { createTestStable } from "@/tests/helpers/createTestStable";
import { createTestNpcHorse } from "@/tests/helpers/createTestHorse";
import { asNpcStableId, asHorseId } from "@/core/types/branded";
import { createRng } from "@/core/common/rng";
import { makeNpcOwned } from "@/core/horse/ownership";

describe("personalityConsignmentPolicy", () => {
  const rng = createRng("test");

  it("aggressive stable consigns weanlings (age 0)", () => {
    const stable = createTestStable({ id: asNpcStableId("s1"), personality: "aggressive" });
    const ownership = makeNpcOwned(stable.id);
    const h1 = createTestNpcHorse({ id: asHorseId("h1"), age: 0, ownership, racingViable: true });
    const h2 = createTestNpcHorse({ id: asHorseId("h2"), age: 2, ownership, racingViable: true });

    const { consign } = personalityConsignmentPolicy(stable, "weanling", [h1, h2], rng);
    expect(consign).toHaveLength(1);
    expect(consign[0].id).toBe("h1");
  });

  it("breeder stable consigns colts to non-broodmare auctions and fading mares to broodmare auctions", () => {
    const stable = createTestStable({ id: asNpcStableId("s2"), personality: "breeder" });
    const ownership = makeNpcOwned(stable.id);
    const colt = createTestNpcHorse({
      id: asHorseId("c1"),
      age: 4,
      gender: "colt",
      ownership,
      racingViable: true,
    });
    const fadingMare = createTestNpcHorse({
      id: asHorseId("m1"),
      age: 10,
      peakAge: 5,
      gender: "mare",
      ownership,
      racingViable: true,
    });

    // Racing age auction: prefers colts
    const { consign: racingConsign } = personalityConsignmentPolicy(
      stable,
      "racing_age",
      [colt, fadingMare],
      rng,
    );
    expect(racingConsign).toHaveLength(1);
    expect(racingConsign[0].id).toBe("c1");

    // Broodmare auction: prefers fading mares
    const { consign: broodmareConsign } = personalityConsignmentPolicy(
      stable,
      "broodmare",
      [colt, fadingMare],
      rng,
    );
    expect(broodmareConsign).toHaveLength(1);
    expect(broodmareConsign[0].id).toBe("m1");
  });

  it("win-now stable consigns fading horses appropriately", () => {
    const stable = createTestStable({ id: asNpcStableId("s3"), personality: "win-now" });
    const ownership = makeNpcOwned(stable.id);
    const fadingMare = createTestNpcHorse({
      id: asHorseId("m1"),
      age: 10,
      peakAge: 5,
      gender: "mare",
      ownership,
      racingViable: true,
    });
    const fadingColt = createTestNpcHorse({
      id: asHorseId("c1"),
      age: 7,
      peakAge: 5,
      gender: "colt",
      ownership,
      racingViable: true,
    });

    // Broodmare auction: fading mares
    const { consign: broodmareConsign } = personalityConsignmentPolicy(
      stable,
      "broodmare",
      [fadingMare, fadingColt],
      rng,
    );
    expect(broodmareConsign).toHaveLength(1);
    expect(broodmareConsign[0].id).toBe("m1");

    // Racing age auction: fading non-mares
    const { consign: racingConsign } = personalityConsignmentPolicy(
      stable,
      "racing_age",
      [fadingMare, fadingColt],
      rng,
    );
    expect(racingConsign).toHaveLength(1);
    expect(racingConsign[0].id).toBe("c1");
  });

  it("prestige stable consigns elite horses (high fame/potential)", () => {
    const stable = createTestStable({ id: asNpcStableId("s4"), personality: "prestige" });
    const ownership = makeNpcOwned(stable.id);
    const avgHorse = createTestNpcHorse({
      id: asHorseId("h1"),
      age: 4,
      gender: "colt",
      fame: 0,
      potential: 50,
      ownership,
      racingViable: true,
    });
    const eliteHorse = createTestNpcHorse({
      id: asHorseId("h2"),
      age: 4,
      gender: "colt",
      fame: 30,
      potential: 90,
      ownership,
      racingViable: true,
    });

    const { consign } = personalityConsignmentPolicy(
      stable,
      "racing_age",
      [avgHorse, eliteHorse],
      rng,
    );
    expect(consign).toHaveLength(1);
    expect(consign[0].id).toBe("h2");
  });

  it("filters out horses already consigned to an auction", () => {
    const stable = createTestStable({ id: asNpcStableId("s5"), personality: "aggressive" });
    const ownership = makeNpcOwned(stable.id);
    const h1 = createTestNpcHorse({ id: asHorseId("h1"), age: 0, ownership, racingViable: true });
    const h2 = createTestNpcHorse({
      id: asHorseId("h2"),
      age: 0,
      ownership,
      consignedSaleId: "sale-1",
      racingViable: true,
    });

    const { consign } = personalityConsignmentPolicy(stable, "weanling", [h1, h2], rng);
    // h2 matches age criteria but is already consigned
    expect(consign).toHaveLength(1);
    expect(consign[0].id).toBe("h1");
  });
});
