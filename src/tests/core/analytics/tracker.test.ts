import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { trackEvent, flushEvents } from "@/core/analytics/tracker";

const ANALYTICS_KEY = "gallop_analytics_events";

describe("analytics tracker", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends event to localStorage queue", () => {
    trackEvent("test_event", { foo: "bar" });
    const raw = localStorage.getItem(ANALYTICS_KEY);
    expect(raw).toBeTruthy();
    const queue = JSON.parse(raw!);
    expect(queue).toHaveLength(1);
    expect(queue[0].event).toBe("test_event");
    expect(queue[0].properties).toEqual({ foo: "bar" });
    expect(typeof queue[0].timestamp).toBe("number");
  });

  it("caps queue at 100 events (oldest dropped)", () => {
    for (let i = 0; i < 105; i++) {
      trackEvent("event", { index: i });
    }
    const queue = JSON.parse(localStorage.getItem(ANALYTICS_KEY)!);
    expect(queue).toHaveLength(100);
    expect(queue[0].properties.index).toBe(5);
    expect(queue[99].properties.index).toBe(104);
  });

  it("flushEvents returns all events and clears queue", () => {
    trackEvent("a");
    trackEvent("b");
    const flushed = flushEvents();
    expect(flushed).toHaveLength(2);
    expect(flushed[0].event).toBe("a");
    expect(flushed[1].event).toBe("b");
    expect(localStorage.getItem(ANALYTICS_KEY)).toBe("[]");
  });

  it("gracefully handles localStorage getItem throwing", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("disabled");
    });
    expect(() => trackEvent("x")).not.toThrow();
  });

  it("gracefully handles localStorage setItem throwing", () => {
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => trackEvent("x")).not.toThrow();
  });

  it("gracefully handles invalid JSON in localStorage", () => {
    localStorage.setItem(ANALYTICS_KEY, "{ invalid }");
    expect(() => trackEvent("x")).not.toThrow();
    const raw = localStorage.getItem(ANALYTICS_KEY);
    const queue = JSON.parse(raw!);
    expect(queue).toHaveLength(1);
    expect(queue[0].event).toBe("x");
  });
});
