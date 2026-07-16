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

  it("flushEvents returns [] and does not throw when getItem throws", () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("disabled");
    });
    expect(() => {
      const flushed = flushEvents();
      expect(flushed).toEqual([]);
    }).not.toThrow();
  });

  it("flushEvents returns queued events and does not throw when setItem throws", () => {
    trackEvent("a");
    trackEvent("b");
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => {
      const flushed = flushEvents();
      expect(flushed).toHaveLength(2);
    }).not.toThrow();
  });

  it("schema-invalid JSON (valid JSON, wrong shape) starts fresh queue", () => {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify([{ wrong: "shape" }]));
    expect(() => trackEvent("x")).not.toThrow();
    const raw = localStorage.getItem(ANALYTICS_KEY);
    const queue = JSON.parse(raw!);
    expect(queue).toHaveLength(1);
    expect(queue[0].event).toBe("x");
  });

  it("flushEvents on empty queue returns [] and sets localStorage to []", () => {
    const flushed = flushEvents();
    expect(flushed).toEqual([]);
    expect(localStorage.getItem(ANALYTICS_KEY)).toBe("[]");
  });

  it("queue at exactly 100 boundary does not shift; 101st triggers shift", () => {
    for (let i = 0; i < 100; i++) {
      trackEvent("event", { index: i });
    }
    let queue = JSON.parse(localStorage.getItem(ANALYTICS_KEY)!);
    expect(queue).toHaveLength(100);
    expect(queue[0].properties.index).toBe(0);

    trackEvent("event", { index: 100 });
    queue = JSON.parse(localStorage.getItem(ANALYTICS_KEY)!);
    expect(queue).toHaveLength(100);
    expect(queue[0].properties.index).toBe(1);
    expect(queue[99].properties.index).toBe(100);
  });
});
