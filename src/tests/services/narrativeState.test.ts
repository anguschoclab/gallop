import { describe, it, expect } from "vitest";
import { NarrativeState } from "@/services/narrative/narrativeState";
import type { CommentaryLine } from "@/services/narrative/types";

function makeLine(overrides: Partial<CommentaryLine> = {}): CommentaryLine {
  return {
    id: "test-0",
    text: "Test line",
    timestamp: 1.0,
    type: "START",
    ...overrides,
  };
}

describe("NarrativeState — cooldown management", () => {
  it("canAnnounce returns true when no cooldown has been set", () => {
    const state = new NarrativeState();
    expect(state.canAnnounce("LEAD_CHANGE", "h1", 0)).toBe(true);
  });

  it("canAnnounce returns false immediately after setCooldown", () => {
    const state = new NarrativeState();
    state.setCooldown("LEAD_CHANGE", "h1", 5.0, 15);
    expect(state.canAnnounce("LEAD_CHANGE", "h1", 5.0)).toBe(false);
  });

  it("canAnnounce returns true after cooldown expires", () => {
    const state = new NarrativeState();
    state.setCooldown("LEAD_CHANGE", "h1", 5.0, 15);
    // expiry = 5.0 + 15 = 20.0; simTime 20.0 should be allowed
    expect(state.canAnnounce("LEAD_CHANGE", "h1", 20.0)).toBe(true);
  });

  it("cooldown key is namespaced — different event types do not interfere", () => {
    const state = new NarrativeState();
    state.setCooldown("SURGE", "h1", 5.0, 20);
    // FADE:h1 has no cooldown
    expect(state.canAnnounce("FADE", "h1", 5.0)).toBe(true);
    // SURGE:h1 is blocked
    expect(state.canAnnounce("SURGE", "h1", 5.0)).toBe(false);
  });

  it("different keys for the same event type do not interfere", () => {
    const state = new NarrativeState();
    state.setCooldown("LEAD_CHANGE", "h1", 0.0, 15);
    expect(state.canAnnounce("LEAD_CHANGE", "h2", 0.0)).toBe(true);
    expect(state.canAnnounce("LEAD_CHANGE", "h1", 0.0)).toBe(false);
  });
});

describe("NarrativeState — commentary accumulation", () => {
  it("push() appends a line to commentary", () => {
    const state = new NarrativeState();
    const line = makeLine();
    state.push(line);
    expect(state.getCommentary()).toHaveLength(1);
    expect(state.getCommentary()[0]).toBe(line);
  });

  it("push() with multiple args appends all", () => {
    const state = new NarrativeState();
    state.push(makeLine({ id: "a" }), makeLine({ id: "b" }), makeLine({ id: "c" }));
    expect(state.getCommentary()).toHaveLength(3);
  });

  it("getCommentary() returns the same accumulated array across calls", () => {
    const state = new NarrativeState();
    state.push(makeLine());
    const first = state.getCommentary();
    state.push(makeLine({ id: "test-1" }));
    expect(state.getCommentary()).toHaveLength(2);
    expect(first).toBe(state.getCommentary()); // same reference
  });
});

describe("NarrativeState — boolean flags and counters", () => {
  it("all announced flags default to false", () => {
    const state = new NarrativeState();
    expect(state.hasAnnouncedStart).toBe(false);
    expect(state.hasAnnouncedFinish).toBe(false);
    expect(state.hasAnnouncedStretch).toBe(false);
  });

  it("lineCounter starts at 0 and nextId() increments it", () => {
    const state = new NarrativeState();
    expect(state.lineCounter).toBe(0);
    expect(state.nextId()).toBe(0);
    expect(state.lineCounter).toBe(1);
    expect(state.nextId()).toBe(1);
    expect(state.lineCounter).toBe(2);
  });

  it("announcedMilestones starts empty", () => {
    const state = new NarrativeState();
    expect(state.announcedMilestones.size).toBe(0);
  });

  it("hasAnnouncedBio starts empty", () => {
    const state = new NarrativeState();
    expect(state.hasAnnouncedBio.size).toBe(0);
  });

  it("lastRanks starts empty", () => {
    const state = new NarrativeState();
    expect(state.lastRanks.size).toBe(0);
  });

  it("lastLeaderId starts null", () => {
    const state = new NarrativeState();
    expect(state.lastLeaderId).toBeNull();
  });
});
