/**
 * useCommentaryFeed.test.ts
 *
 * Tests for the commentary message-draining hook extracted from useRaceUIState.
 * Covers: interval-based drain timing, 1500ms pacing gate, announcement/commentary/
 * subjectHorseId updates, 50-item slice cap, subject-highlight clear after 3s,
 * no drain when finished.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MutableRefObject } from "react";
import type { CommentaryLine } from "@/services/narrative/commentaryGenerator";

function makeQueue(lines: CommentaryLine[] = []): MutableRefObject<CommentaryLine[]> {
  return { current: lines } as MutableRefObject<CommentaryLine[]>;
}

// Import after mocks — the module doesn't exist yet, so this will fail (RED).
import { useCommentaryFeed } from "@/hooks/race/useCommentaryFeed";

function makeLine(id: string, text: string, horseId?: string): CommentaryLine {
  return {
    id,
    text,
    timestamp: parseFloat(id.replace("c", "")) || 0,
    type: "INFO",
    horseId: horseId ?? null,
    isHighImpact: false,
  } as unknown as CommentaryLine;
}

describe("useCommentaryFeed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty initial state", () => {
    const queue = makeQueue([]);
    const { result } = renderHook(() => useCommentaryFeed(queue, false));

    expect(result.current.commentary).toEqual([]);
    expect(result.current.announcement).toBe("");
    expect(result.current.subjectHorseId).toBeNull();
  });

  it("drains queued messages with 1500ms pacing gate", () => {
    const queue = makeQueue([makeLine("c1", "And they're off!")]);
    const { result } = renderHook(() => useCommentaryFeed(queue, false));

    // First message drains at first interval tick (100ms) because
    // lastMessageTime starts at 0 and Date.now() returns a large timestamp
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.commentary).toHaveLength(1);
    expect(result.current.announcement).toBe("And they're off!");

    // Add another message to queue
    queue.current.push(makeLine("c2", "Taking the lead"));

    // 100ms later: pacing gate (1500ms since last drain) not yet met
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.commentary).toHaveLength(1);

    // At 1500ms since last drain: still not > 1500, no drain
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(result.current.commentary).toHaveLength(1);

    // At 1600ms since last drain: > 1500, second message drains
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.commentary).toHaveLength(2);
    expect(result.current.announcement).toBe("Taking the lead");
  });

  it("caps commentary at 50 items", () => {
    const queue = makeQueue(Array.from({ length: 60 }, (_, i) => makeLine(`c${i}`, `Line ${i}`)));
    const { result } = renderHook(() => useCommentaryFeed(queue, false));

    // Drain all 60 messages (need 60 * 1500ms = 90000ms + some buffer)
    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(1600);
      });
    }

    expect(result.current.commentary).toHaveLength(50);
    expect(result.current.commentary[0].text).toBe("Line 10");
    expect(result.current.commentary[49].text).toBe("Line 59");
  });

  it("sets subjectHorseId from message and clears after 3000ms", () => {
    const queue = makeQueue([makeLine("c1", "Speed horse leads", "horse-42")]);
    const { result } = renderHook(() => useCommentaryFeed(queue, false));

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.subjectHorseId).toBe("horse-42");

    // After 3000ms, subject highlight clears
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.subjectHorseId).toBeNull();
  });

  it("does not clear subjectHorseId if a newer message set a different horse", () => {
    const queue = makeQueue([makeLine("c1", "First", "horse-a")]);
    const { result } = renderHook(() => useCommentaryFeed(queue, false));

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.subjectHorseId).toBe("horse-a");

    // Queue a second message for a different horse, wait for pacing gate
    queue.current.push(makeLine("c2", "Second", "horse-b"));
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.subjectHorseId).toBe("horse-b");

    // The first message's 3000ms timeout fires but should not clear horse-b
    act(() => {
      vi.advanceTimersByTime(1400); // total 3000ms since first message
    });
    expect(result.current.subjectHorseId).toBe("horse-b");
  });

  it("does not drain messages when finished is true", () => {
    const queue = makeQueue([makeLine("c1", "Finished message")]);
    const { result } = renderHook(() => useCommentaryFeed(queue, true));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.commentary).toHaveLength(0);
    expect(result.current.announcement).toBe("");
    expect(queue.current).toHaveLength(1); // message not consumed
  });

  it("handles messages with null horseId", () => {
    const queue = makeQueue([makeLine("c1", "Race update", null as any)]);
    const { result } = renderHook(() => useCommentaryFeed(queue, false));

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.subjectHorseId).toBeNull();
    expect(result.current.commentary).toHaveLength(1);
  });

  describe("lastUpdatedAt badge timing behavior", () => {
    it("initializes lastUpdatedAt to the current system time", () => {
      const startTime = 1700000000000;
      vi.setSystemTime(startTime);

      const queue = makeQueue([]);
      const { result } = renderHook(() => useCommentaryFeed(queue, false));

      expect(result.current.lastUpdatedAt).toBe(startTime);
    });

    it("updates lastUpdatedAt to the exact time of message drain", () => {
      const startTime = 1700000000000;
      vi.setSystemTime(startTime);

      const queue = makeQueue([makeLine("c1", "Off to the races!")]);
      const { result } = renderHook(() => useCommentaryFeed(queue, false));

      expect(result.current.lastUpdatedAt).toBe(startTime);

      // Drain message at 100ms interval tick
      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.lastUpdatedAt).toBe(startTime + 100);
    });

    it("does not update lastUpdatedAt during ticks when the queue is empty", () => {
      const startTime = 1700000000000;
      vi.setSystemTime(startTime);

      const queue = makeQueue([]);
      const { result } = renderHook(() => useCommentaryFeed(queue, false));

      expect(result.current.lastUpdatedAt).toBe(startTime);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Still startTime because no message drained
      expect(result.current.lastUpdatedAt).toBe(startTime);
    });

    it("does not update lastUpdatedAt while waiting for the pacing gate", () => {
      const startTime = 1700000000000;
      vi.setSystemTime(startTime);

      const queue = makeQueue([makeLine("c1", "First")]);
      const { result } = renderHook(() => useCommentaryFeed(queue, false));

      // First message drains at 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });
      const firstDrainTime = startTime + 100;
      expect(result.current.lastUpdatedAt).toBe(firstDrainTime);

      // Queue next message immediately
      queue.current.push(makeLine("c2", "Second"));

      // Advance by 1400ms (total 1500ms since start, 1400ms since drain <= 1500ms pacing)
      act(() => {
        vi.advanceTimersByTime(1400);
      });

      // Still firstDrainTime because pacing gate has not passed
      expect(result.current.lastUpdatedAt).toBe(firstDrainTime);

      // Advance another 200ms (> 1500ms pacing) to trigger drain
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.lastUpdatedAt).toBe(firstDrainTime + 1400 + 200);
    });

    it("does not update lastUpdatedAt when finished is true even if queue has messages", () => {
      const startTime = 1700000000000;
      vi.setSystemTime(startTime);

      const queue = makeQueue([makeLine("c1", "Finished")]);
      const { result } = renderHook(() => useCommentaryFeed(queue, true));

      expect(result.current.lastUpdatedAt).toBe(startTime);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.lastUpdatedAt).toBe(startTime);
    });
  });
});
