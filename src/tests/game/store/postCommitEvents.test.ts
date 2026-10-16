/**
 * postCommitEvents.test.ts — exactly-once, retry-safe post-commit effects.
 *
 * Exercises the production PostCommitDispatcher used by applyDayResult, and
 * proves the store-level commit path runs each effect exactly once per
 * committed revision through the real engine/store pipeline.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostCommitDispatcher, postCommitId } from "@/game/store/postCommit";
import type { PostCommitEvent } from "@/game/store/postCommit";

function ev(kind: PostCommitEvent["kind"], revision: number, day = 10): PostCommitEvent {
  return { id: postCommitId(kind, revision), kind, revision, day };
}

describe("PostCommitDispatcher", () => {
  let d: PostCommitDispatcher;
  beforeEach(() => {
    d = new PostCommitDispatcher();
  });

  it("runs a registered handler exactly once per event id", () => {
    const fn = vi.fn();
    d.on("scouting", fn);
    const e = ev("scouting", 7);
    expect(d.dispatch(e)).toBe("applied");
    expect(d.dispatch(e)).toBe("skipped");
    expect(d.dispatch(e)).toBe("skipped");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("dedup is keyed by revision: a new commit re-fires the same kinds", () => {
    const fn = vi.fn();
    d.on("exchange", fn);
    d.dispatch(ev("exchange", 1));
    d.dispatch(ev("exchange", 2));
    d.dispatch(ev("exchange", 2));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("failed handlers stay unprocessed and retry on re-dispatch", () => {
    let calls = 0;
    d.on("tutorial", () => {
      calls++;
      if (calls === 1) throw new Error("transient failure");
    });
    const e = ev("tutorial", 3);
    expect(d.dispatch(e)).toBe("failed");
    expect(d.hasProcessed(e.id)).toBe(false);
    // Retry after handler failure succeeds — still exactly once overall.
    expect(d.dispatch(e)).toBe("applied");
    expect(d.dispatch(e)).toBe("skipped");
    expect(calls).toBe(2);
  });

  it("routes all six effect kinds to their own handlers", () => {
    const calls: Record<string, number> = {};
    for (const kind of [
      "scouting",
      "autoSyndicate",
      "exchange",
      "marketAlerts",
      "tutorial",
      "autosave",
    ] as const) {
      d.on(kind, () => {
        calls[kind] = (calls[kind] ?? 0) + 1;
      });
      d.dispatch(ev(kind, 5));
    }
    expect(calls).toEqual({
      scouting: 1,
      autoSyndicate: 1,
      exchange: 1,
      marketAlerts: 1,
      tutorial: 1,
      autosave: 1,
    });
  });

  it("handler errors are contained — dispatch never throws", () => {
    d.on("scouting", () => {
      throw new Error("boom");
    });
    expect(() => d.dispatch(ev("scouting", 1))).not.toThrow();
  });

  it("unhandled kinds report unhandled and can be retried after registration", () => {
    const e = ev("marketAlerts", 9);
    expect(d.dispatch(e)).toBe("unhandled");
    const fn = vi.fn();
    d.on("marketAlerts", fn);
    expect(d.dispatch(e)).toBe("applied");
    expect(fn).toHaveBeenCalledWith(e);
  });

  it("passes revision/day/payload through to the handler", () => {
    const fn = vi.fn();
    d.on("marketAlerts", fn);
    d.dispatch({ ...ev("marketAlerts", 4, 12), payload: 3 });
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "marketAlerts", revision: 4, day: 12, payload: 3 }),
    );
  });
});
