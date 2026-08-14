import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { useCancelBreedingProgram } from "@/components/breeding/useCancelBreedingProgram";
import { makeBreedingProgram } from "@/tests/helpers/sampleGameState";
import { TOAST_PROGRAM_CANCELLED, ERR_NO_ACTIVE_PROGRAM } from "@/constants/breedingConstants";

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

function seedStore(overrides: Record<string, unknown> = {}) {
  useGame.setState({ ...createDefaultGameState(), ...overrides } as any);
}

describe("useCancelBreedingProgram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedStore();
  });

  it("returns closed dialog state by default", () => {
    const { result } = renderHook(() => useCancelBreedingProgram());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.activeBreedingProgram).toBeNull();
  });

  it("opens the cancel dialog", () => {
    const { result } = renderHook(() => useCancelBreedingProgram());
    act(() => result.current.openCancelDialog());
    expect(result.current.isOpen).toBe(true);
  });

  it("closes the cancel dialog without cancelling", () => {
    const { result } = renderHook(() => useCancelBreedingProgram());
    act(() => result.current.openCancelDialog());
    act(() => result.current.handleDialogCancel());
    expect(result.current.isOpen).toBe(false);
    expect(useGame.getState().activeBreedingProgram).toBeNull();
  });

  it("confirms cancellation, closes dialog, and toasts success", () => {
    const program = makeBreedingProgram({ id: "prog-1" });
    seedStore({ activeBreedingProgram: program, breedingPrograms: [program] });

    const { result } = renderHook(() => useCancelBreedingProgram());
    act(() => result.current.openCancelDialog());
    act(() => result.current.handleConfirm());

    expect(result.current.isOpen).toBe(false);
    expect(useGame.getState().activeBreedingProgram).toBeNull();
    expect(toast.info).toHaveBeenCalledWith(TOAST_PROGRAM_CANCELLED);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("toasts error and closes dialog when cancellation fails", () => {
    seedStore();

    const { result } = renderHook(() => useCancelBreedingProgram());
    act(() => result.current.openCancelDialog());
    act(() => result.current.handleConfirm());

    expect(result.current.isOpen).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(ERR_NO_ACTIVE_PROGRAM);
    expect(toast.info).not.toHaveBeenCalled();
  });
});
