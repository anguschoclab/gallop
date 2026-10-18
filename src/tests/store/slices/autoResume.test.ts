import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGame } from "@/platform/game/store";
import { createDefaultGameState } from "@/platform/game/store/state";
import { useAutoResumeAdvance } from "@/platform/game/hooks/useAutoResumeAdvance";
import { asRaceId } from "@/shared/types/branded";

/**
 * Production-path tests: the real store and the real auto-resume hook.
 * advanceMultipleDays is stubbed at the store boundary so the test observes
 * the resume command without running a simulation.
 */
function seedStore(overrides: Record<string, unknown> = {}) {
  useGame.setState({ ...createDefaultGameState(), ...overrides } as any);
}

const interrupted = (overrides = {}) => ({
  status: "interrupted" as const,
  daysCompleted: 15,
  totalDays: 30,
  ...overrides,
});

describe("useAutoResumeAdvance (production path)", () => {
  let resume: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resume = vi.fn().mockResolvedValue(undefined);
    seedStore({
      advanceMultipleDays: resume,
      execution: { status: "idle", daysCompleted: 0, totalDays: 0 },
    });
  });

  it("resumes the remaining days once the interrupting race is dismissed", async () => {
    // Engine interrupted a 30-day advance after 15 days.
    seedStore({
      execution: interrupted({ interruptRaceId: asRaceId("race-1"), remainingDays: 15 }),
    });
    renderHook(() => useAutoResumeAdvance());

    // Race still pending — no resume.
    expect(resume).not.toHaveBeenCalled();

    // User finishes the race; prompt clears the interrupt race id.
    await act(async () => {
      useGame.setState({
        execution: { ...useGame.getState().execution!, interruptRaceId: undefined },
      });
    });

    expect(resume).toHaveBeenCalledTimes(1);
    expect(resume).toHaveBeenCalledWith(15);
    // Counter cleared so the resume cannot fire twice.
    expect(useGame.getState().execution?.remainingDays).toBeUndefined();
  });

  it("does not resume while an advance is in flight", async () => {
    seedStore({
      execution: { status: "running", daysCompleted: 5, totalDays: 30, remainingDays: 10 },
    });
    renderHook(() => useAutoResumeAdvance());
    await act(async () => {});
    expect(resume).not.toHaveBeenCalled();
  });

  it("does not resume when Stop Here cleared the interruption", async () => {
    seedStore({ execution: { status: "idle", daysCompleted: 0, totalDays: 0 } });
    renderHook(() => useAutoResumeAdvance());
    await act(async () => {});
    expect(resume).not.toHaveBeenCalled();
  });

  it("does not double-fire if the hook re-renders during resume", async () => {
    let resolveResume: (() => void) | undefined;
    resume.mockImplementation(() => new Promise<void>((r) => (resolveResume = r)));
    seedStore({ execution: interrupted({ remainingDays: 5 }) });
    const { rerender } = renderHook(() => useAutoResumeAdvance());
    await act(async () => {
      rerender();
    });
    expect(resume).toHaveBeenCalledTimes(1);
    await act(async () => resolveResume?.());
  });
});
