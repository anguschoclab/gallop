import { describe, it, expect } from "vitest";

describe("relocated files are importable from new locations", () => {
  it("raceEngineConstants is importable from @/constants/raceEngineConstants", async () => {
    const mod = await import("@/domains/race/model/engine/constants");
    expect(mod.DEFAULT_DT).toBe(0.1);
    expect(mod.defaultMaxTime).toBeDefined();
  });

  it("inboxConstants is importable from @/constants/inboxConstants", async () => {
    const mod = await import("@/domains/inbox/model/inboxConstants");
    expect(mod).toBeDefined();
  });

  it("regionalConstants is importable from @/constants/regionalConstants", async () => {
    const mod = await import("@/shared/constants/regionalConstants");
    expect(mod.DIST_SPRINT_MAX).toBe(1400);
  });

  it("aiConstants is importable from @/constants/aiConstants", async () => {
    const mod = await import("@/domains/agents/model/aiConstants");
    expect(mod.DEFAULT_SUBSYSTEM_WEIGHT).toBe(1.0);
  });

  it("connectionTrophies is importable from @/core/awards/connectionTrophies", async () => {
    const mod = await import("@/domains/awards/simulation/connectionTrophies");
    expect(mod).toBeDefined();
  });

  it("auctionSearchSchema is importable from @/components/auction/auctionSearchSchema", async () => {
    const mod = await import("@/domains/auction/ui/auctionSearchSchema");
    expect(mod).toBeDefined();
  });
});
