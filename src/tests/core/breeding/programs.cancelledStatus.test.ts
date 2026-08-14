import { describe, it, expect } from "vitest";
import { createBreedingProgram, updateProgramProgress } from "@/core/breeding/programs";
import { getArchetypeById } from "@/core/breeding/archetypes";
import { createTestHorse } from "@/tests/helpers";
import {
  PROGRAM_STATUS_ACTIVE,
  PROGRAM_STATUS_CANCELLED,
  CANCEL_REASON_USER,
} from "@/constants/breedingConstants";

describe("BreedingProgram cancellation metadata", () => {
  it("createBreedingProgram defaults status to active", () => {
    const program = createBreedingProgram("player", "elite-turf-stayer", 1);
    expect(program.status).toBe(PROGRAM_STATUS_ACTIVE);
    expect(program.cancelledAtDay).toBeUndefined();
    expect(program.cancellationReason).toBeUndefined();
  });

  it("updateProgramProgress preserves status and cancellation fields", () => {
    const program = createBreedingProgram("player", "elite-turf-stayer", 1);
    program.status = PROGRAM_STATUS_CANCELLED;
    program.cancelledAtDay = 10;
    program.cancellationReason = CANCEL_REASON_USER;

    const archetype = getArchetypeById("elite-turf-stayer")!;
    const foal = createTestHorse({ id: "foal-1", name: "Test Foal" });
    const updated = updateProgramProgress(program, foal, archetype, 5);

    expect(updated.status).toBe(PROGRAM_STATUS_CANCELLED);
    expect(updated.cancelledAtDay).toBe(10);
    expect(updated.cancellationReason).toBe(CANCEL_REASON_USER);
  });
});
