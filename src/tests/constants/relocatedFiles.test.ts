import { describe, it, expect } from "vitest";

describe("relocated files are importable from new locations", () => {
  it("raceEngineConstants is importable from @/constants/raceEngineConstants", async () => {
    const mod = await import("@/constants/raceEngineConstants");
    expect(mod.DEFAULT_DT).toBe(0.1);
    expect(mod.defaultMaxTime).toBeDefined();
  });

  it("inboxConstants is importable from @/constants/inboxConstants", async () => {
    const mod = await import("@/constants/inboxConstants");
    expect(mod).toBeDefined();
  });

  it("regionalConstants is importable from @/constants/regionalConstants", async () => {
    const mod = await import("@/constants/regionalConstants");
    expect(mod.DIST_SPRINT_MAX).toBe(1400);
  });

  it("aiConstants is importable from @/constants/aiConstants", async () => {
    const mod = await import("@/constants/aiConstants");
    expect(mod.DEFAULT_SUBSYSTEM_WEIGHT).toBe(1.0);
  });

  it("connectionTrophies is importable from @/core/awards/connectionTrophies", async () => {
    const mod = await import("@/core/awards/connectionTrophies");
    expect(mod).toBeDefined();
  });

  it("auctionSearchSchema is importable from @/components/auction/auctionSearchSchema", async () => {
    const mod = await import("@/components/auction/auctionSearchSchema");
    expect(mod).toBeDefined();
  });
});
