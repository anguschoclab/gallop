/**
 * Architecture guard: the simulation redesign's removed paths must stay gone.
 *
 * Fails if any legacy execution machinery reappears in production sources:
 * - numeric stage-range pipeline filtering (STAGE_RANGES / pipelineStages.ts)
 * - the global `persistenceEnabled` suppression flag
 * - the `livePlayerImpactsApplied` double-application workaround
 * - a second synchronous simulation path on the main thread (store actions
 *   must always submit through EngineClient)
 * - the legacy standalone `executePipeline` runner (SimulationExecutor owns
 *   phase iteration via the compiled schedule)
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function collectFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(full)) {
      acc.push(full);
    }
  }
  return acc;
}

const productionFiles = collectFiles(SRC).filter(
  (f) => !f.includes(`${join("src", "tests")}`) && !f.includes(join("tests", "helpers")),
);

describe("engine architecture guards", () => {
  it("the numeric stage-range machinery is deleted", () => {
    expect(existsSync(join(SRC, "workers", "pipelineStages.ts"))).toBe(false);
    const offenders = productionFiles.filter((f) =>
      /STAGE_RANGES|pipelineStages/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("no global persistence suppression flag remains", () => {
    const offenders = productionFiles.filter((f) =>
      /persistenceEnabled/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("the live-impact double-application workaround is gone", () => {
    const offenders = productionFiles.filter((f) =>
      /livePlayerImpactsApplied/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("the engine worker contains no pipeline semantics of its own", () => {
    const worker = readFileSync(join(SRC, "workers", "engine.worker.ts"), "utf8");
    expect(worker).not.toMatch(/GAME_PIPELINE_PHASES|runPipelineForDay|pipeline\.ts/);
    expect(worker).toMatch(/SimulationEngine/);
  });

  it("advancement flows through EngineClient — store never executes phases", () => {
    const advance = readFileSync(
      join(SRC, "game", "store", "slices", "advanceDayActions.ts"),
      "utf8",
    );
    expect(advance).toMatch(/getEngineClient\(\)\.submit|client\.submit/);
    expect(advance).not.toMatch(/executePipeline|GAME_PIPELINE_PHASES|SimulationExecutor/);
  });

  it("the standalone executePipeline runner is decommissioned", () => {
    const pipeline = readFileSync(join(SRC, "core", "time", "pipeline.ts"), "utf8");
    expect(pipeline).not.toMatch(/export function executePipeline|function executePipeline/);
    const offenders = productionFiles.filter((f) =>
      /\bexecutePipeline\b/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
