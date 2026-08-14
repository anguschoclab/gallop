import { describe, it, expect } from "vitest";
import { generateCommentaryLine } from "@/services/narrative/commentaryGenerator";
import type { Race } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { createRng, hashStr } from "@/core/common/rng";
import { TEMPLATES } from "@/assets/narrative/templates";

function makeRace(): Race {
  return {
    id: "r1",
    name: "Test Race",
    day: 1,
    distance: 1600,
    raceClass: "Allowance",
    entryFee: 0,
    purse: 0,
    fieldSize: 2,
    entries: [],
    resolved: false,
  } as Race;
}

function makeRunner(): Runner {
  return {
    horseId: "filler-1",
    name: "Fable of Golden",
    position: 800,
    velocity: 17,
    finishTime: null,
    lane: 1,
  } as Runner;
}

describe("commentary placeholder substitution", () => {
  it("substitutes {horse} even when no Horse record exists (filler runners)", () => {
    for (const type of Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>) {
      for (let seed = 0; seed < 40; seed++) {
        const line = generateCommentaryLine(
          type as never,
          10,
          {
            race: makeRace(),
            runner: makeRunner(),
            horse: undefined,
            stable: null,
            rng: createRng(hashStr(`seed-${type}-${seed}`)),
            lengths: "2.5",
            hasAnnouncedBio: new Set<string>(),
            lastRanks: new Map([["filler-1", 3]]),
          },
          { value: 0 },
        );
        expect(line.text).not.toContain("{horse}");
        expect(line.text).not.toContain("{coat}");
        expect(line.text).not.toContain("{sire}");
        expect(line.text).not.toContain("{dam}");
        expect(line.text).not.toContain("{stable}");
      }
    }
  });

  it("replaces every occurrence of a repeated placeholder", () => {
    const line = generateCommentaryLine(
      "SURGE" as never,
      10,
      {
        race: makeRace(),
        runner: makeRunner(),
        horse: undefined,
        stable: null,
        rng: createRng(hashStr("repeat")),
        hasAnnouncedBio: new Set<string>(),
        lastRanks: new Map(),
      },
      { value: 0 },
    );
    expect(line.text).not.toContain("{");
  });
});
