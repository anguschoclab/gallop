import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runCapabilityAudit } from "../../../scripts/orphan-audit";
import { STORE_STATE_VERSION } from "@/game/store/stateVersion";

const ROOT = process.cwd();
const manifestPath = join(ROOT, "src/tests/fixtures/campaignManifest.json");

type CampaignManifest = {
  schemaVersion: number;
  branch: string;
  capabilityGraph: {
    source: string;
    intents: number;
    impacts: number;
    phases: number;
    routes: number;
    components: number;
    status: string;
  };
  findings: { id: string; status: string; evidence: string }[];
  testFirstLedger: {
    workstream: string;
    redGate: string;
    greenGate: string;
    testFiles: string[];
    productionScopes: string[];
  }[];
  moveManifests: string[];
  deletionManifest: { path: string; disposition: string; evidence: string }[];
  persistence: { storeVersion: number; policy: string };
  performance: {
    deterministicFingerprints: Record<string, string>;
    benchmarks: { name: string; command: string; result: string }[];
  };
};

function readManifest(): CampaignManifest {
  return JSON.parse(readFileSync(manifestPath, "utf8")) as CampaignManifest;
}

describe("campaign evidence manifest", () => {
  it("records the current derived capability graph without stale counts", () => {
    const manifest = readManifest();
    const audit = runCapabilityAudit(ROOT);
    expect(manifest.capabilityGraph.source).toBe("scripts/orphan-audit.ts");
    expect(manifest.capabilityGraph.status).toBe("clean");
    expect(manifest.capabilityGraph.intents).toBe(audit.intents.all.length);
    expect(manifest.capabilityGraph.impacts).toBe(audit.impacts.all.length);
    expect(manifest.capabilityGraph.phases).toBe(audit.phases.registered.length);
    expect(manifest.capabilityGraph.routes).toBe(audit.files.routeCount);
    expect(manifest.capabilityGraph.components).toBe(audit.files.componentCount);
  });

  it("contains no open findings and cites evidence for every disposition", () => {
    const manifest = readManifest();
    expect(manifest.findings.length).toBeGreaterThan(0);
    for (const finding of manifest.findings) {
      expect(finding.id.length).toBeGreaterThan(0);
      expect(["APPROVED", "DISPROVED", "CORRECTED", "DEFERRED"]).toContain(finding.status);
      expect(finding.evidence.length).toBeGreaterThan(0);
    }
  });

  it("links every campaign workstream to tests, a RED gate, and production scope", () => {
    const manifest = readManifest();
    expect(manifest.testFirstLedger.length).toBeGreaterThanOrEqual(8);
    for (const entry of manifest.testFirstLedger) {
      expect(entry.redGate.length).toBeGreaterThan(0);
      expect(entry.greenGate.length).toBeGreaterThan(0);
      expect(entry.testFiles.length).toBeGreaterThan(0);
      expect(entry.productionScopes.length).toBeGreaterThan(0);
      for (const testFile of entry.testFiles) {
        expect(existsSync(join(ROOT, testFile)), testFile).toBe(true);
      }
    }
  });

  it("preserves move/deletion evidence and the intentional save reset", () => {
    const manifest = readManifest();
    for (const path of manifest.moveManifests) {
      expect(existsSync(join(ROOT, path)), path).toBe(true);
    }
    for (const deletion of manifest.deletionManifest) {
      expect(deletion.disposition.length).toBeGreaterThan(0);
      expect(deletion.evidence.length).toBeGreaterThan(0);
    }
    expect(manifest.persistence.storeVersion).toBe(STORE_STATE_VERSION);
    expect(manifest.persistence.policy).toBe("hard_reset_incompatible_saves");
  });

  it("documents deterministic fingerprints and benchmark commands", () => {
    const manifest = readManifest();
    expect(Object.keys(manifest.performance.deterministicFingerprints).length).toBeGreaterThan(0);
    expect(manifest.performance.benchmarks.length).toBeGreaterThanOrEqual(2);
    for (const benchmark of manifest.performance.benchmarks) {
      expect(benchmark.command.length).toBeGreaterThan(0);
      expect(benchmark.result.length).toBeGreaterThan(0);
    }
  });
});
