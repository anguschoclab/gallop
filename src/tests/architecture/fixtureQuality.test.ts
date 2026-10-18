import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const DESIGNATED_SUITES = [
  "src/tests/integration/advancedAiPipeline.test.ts",
  "src/tests/core/time/descriptorRuntimeContract.test.ts",
  "src/tests/core/time/phases/claimingLifecycle.test.ts",
  "src/tests/core/ai/npcActionRegistry.test.ts",
  "src/tests/domains/agents/simulation/npcCycleDiagnostics.test.ts",
  "src/tests/core/npc/intents/facilityWeights.test.ts",
  "src/tests/core/npc/intents/insuranceIntents.test.ts",
  "src/tests/integration/crossSystemLoops.test.ts",
  "src/tests/integration/intentProductionPath.test.ts",
];

const FORBIDDEN_CASTS = [
  /\bas\s+unknown\s+as\s+GameState\b/,
  /\bas\s+GameState\b/,
  /\bas\s+StableAIState\b/,
  /\bas\s+NpcAIManager\b/,
  /\bas\s+any\b/,
];

describe("fixture quality for megaplan suites", () => {
  it("rejects partial GameState/AI casts and untyped fixtures in designated suites", () => {
    const violations = DESIGNATED_SUITES.flatMap((file) => {
      const source = readFileSync(join(ROOT, file), "utf8");
      return FORBIDDEN_CASTS.filter((pattern) => pattern.test(source)).map(
        (pattern) => `${file}: ${pattern.source}`,
      );
    });

    expect(violations).toEqual([]);
  });
});
