import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { makeBreedingProgram } from "@/tests/helpers/sampleGameState";
import type { BreedingProgram } from "@/core/breeding/programs";
import {
  PROGRAM_STATUS_ACTIVE,
  PROGRAM_STATUS_CANCELLED,
  CANCEL_REASON_USER,
  CANCEL_REASON_AUTO,
  ERR_NO_ACTIVE_PROGRAM,
} from "@/constants/breedingConstants";

function seedStore(overrides: Record<string, unknown> = {}) {
  useGame.setState({ ...createDefaultGameState(), ...overrides } as any);
}

describe("breedingProgramSlice — cancellation", () => {
  beforeEach(() => {
    seedStore({
      playerProfile: {
        stableName: "Test Stable",
        ownerName: "Test Owner",
        silk: {
          pattern: "solid",
          primary: "#000000",
          secondary: "#FFFFFF",
          cap: "#000000",
        },
      },
    });
  });

  it("startBreedingProgram creates a program with status active", () => {
    const result = useGame.getState().startBreedingProgram("elite-turf-stayer");
    expect(result.ok).toBe(true);
    expect(useGame.getState().activeBreedingProgram?.status).toBe(PROGRAM_STATUS_ACTIVE);
    expect(useGame.getState().breedingPrograms[0].status).toBe(PROGRAM_STATUS_ACTIVE);
  });

  it("cancelBreedingProgram returns failure when no program is active", () => {
    const result = useGame.getState().cancelBreedingProgram();
    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toBe(ERR_NO_ACTIVE_PROGRAM);
  });

  it("cancelBreedingProgram marks the history entry as cancelled and clears enrolled dams", () => {
    const program = makeBreedingProgram({
      id: "prog-1",
      archetypeId: "elite-turf-stayer",
      enrolledDamIds: ["mare-1", "mare-2"],
    });
    seedStore({
      day: 42,
      activeBreedingProgram: program,
      breedingPrograms: [program],
    });

    const result = useGame.getState().cancelBreedingProgram();
    expect(result.ok).toBe(true);

    const state = useGame.getState();
    expect(state.activeBreedingProgram).toBeNull();

    const historyEntry = state.breedingPrograms.find((p: BreedingProgram) => p.id === "prog-1");
    expect(historyEntry).toBeDefined();
    expect(historyEntry?.status).toBe(PROGRAM_STATUS_CANCELLED);
    expect(historyEntry?.cancelledAtDay).toBe(42);
    expect(historyEntry?.cancellationReason).toBe(CANCEL_REASON_USER);
    expect(historyEntry?.enrolledDamIds).toEqual([]);
  });

  it("cancelBreedingProgram accepts a custom reason", () => {
    const program = makeBreedingProgram({ id: "prog-1" });
    seedStore({
      day: 10,
      activeBreedingProgram: program,
      breedingPrograms: [program],
    });

    useGame.getState().cancelBreedingProgram({ reason: CANCEL_REASON_AUTO });

    const historyEntry = useGame
      .getState()
      .breedingPrograms.find((p: BreedingProgram) => p.id === "prog-1");
    expect(historyEntry?.cancellationReason).toBe(CANCEL_REASON_AUTO);
  });

  it("cancelBreedingProgram appends a log entry with stable name and archetype", () => {
    const program = makeBreedingProgram({ id: "prog-1", archetypeId: "elite-turf-stayer" });
    seedStore({
      day: 42,
      activeBreedingProgram: program,
      breedingPrograms: [program],
    });

    useGame.getState().cancelBreedingProgram();

    const log = useGame.getState().log;
    const entry = log.find((e) => e.text.includes("Elite Turf Stayer"));
    expect(entry).toBeDefined();
    expect(entry?.day).toBe(42);
    expect(entry?.text).toContain("Test Stable");
    expect(entry?.text).toContain("cancelled");
  });
});
