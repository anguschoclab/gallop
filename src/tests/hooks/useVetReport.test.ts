import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import { useVetReport } from "@/hooks/health/useVetReport";
import { createTestHorse } from "@/tests/helpers/createTestHorse";
import { h2r } from "@/tests/helpers/sampleGameState";
import type { ActiveInjury } from "@/game/types";

function seedHorses(horses: ReturnType<typeof createTestHorse>[]) {
  useGame.setState({ ...createDefaultGameState(), horses: h2r(horses) });
}

describe("useVetReport", () => {
  beforeEach(() => {
    useGame.setState(createDefaultGameState());
  });

  it("returns empty array when no horses exist", () => {
    const { result } = renderHook(() => useVetReport());
    expect(result.current.rows).toEqual([]);
    expect(result.current.summary.total).toBe(0);
  });

  it("returns rows for all horses with health data", () => {
    const h1 = createTestHorse({ id: "h-1", name: "Thunder" });
    const h2 = createTestHorse({ id: "h-2", name: "Lightning" });
    seedHorses([h1, h2]);

    const { result } = renderHook(() => useVetReport());
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows.map((r) => r.horseId)).toContain("h-1");
    expect(result.current.rows.map((r) => r.horseId)).toContain("h-2");
  });

  it("classifies healthy horses as green status", () => {
    const h1 = createTestHorse({ id: "h-1", name: "Thunder", healthStatus: "healthy" });
    seedHorses([h1]);

    const { result } = renderHook(() => useVetReport());
    expect(result.current.rows[0].status).toBe("healthy");
    expect(result.current.rows[0].statusColor).toBe("green");
  });

  it("classifies injured horses as red status", () => {
    const injury: ActiveInjury = {
      type: "Tendon strain",
      severity: "moderate",
      recoveryDays: 45,
      onsetDay: 10,
    };
    const h1 = createTestHorse({
      id: "h-1",
      name: "Thunder",
      healthStatus: "recovering",
      activeInjury: injury,
    });
    seedHorses([h1]);

    const { result } = renderHook(() => useVetReport());
    expect(result.current.rows[0].status).toBe("injured");
    expect(result.current.rows[0].statusColor).toBe("red");
    expect(result.current.rows[0].recoveryDays).toBe(45);
  });

  it("classifies recovering (non-injury) horses as yellow status", () => {
    const h1 = createTestHorse({
      id: "h-1",
      name: "Thunder",
      healthStatus: "recovering",
    });
    seedHorses([h1]);

    const { result } = renderHook(() => useVetReport());
    expect(result.current.rows[0].status).toBe("recovering");
    expect(result.current.rows[0].statusColor).toBe("yellow");
  });

  it("sorts by status severity (injured first, then recovering, then healthy)", () => {
    const injury: ActiveInjury = {
      type: "Fracture",
      severity: "major",
      recoveryDays: 90,
      onsetDay: 5,
    };
    const hHealthy = createTestHorse({ id: "h-1", name: "A", healthStatus: "healthy" });
    const hInjured = createTestHorse({
      id: "h-2",
      name: "B",
      healthStatus: "recovering",
      activeInjury: injury,
    });
    const hRecovering = createTestHorse({ id: "h-3", name: "C", healthStatus: "recovering" });
    seedHorses([hHealthy, hInjured, hRecovering]);

    const { result } = renderHook(() => useVetReport({ sortBy: "status" }));
    expect(result.current.rows[0].horseId).toBe("h-2");
    expect(result.current.rows[1].horseId).toBe("h-3");
    expect(result.current.rows[2].horseId).toBe("h-1");
  });

  it("computes summary stats correctly", () => {
    const injury: ActiveInjury = {
      type: "Strain",
      severity: "minor",
      recoveryDays: 14,
      onsetDay: 10,
    };
    const h1 = createTestHorse({ id: "h-1", name: "A", healthStatus: "healthy", fitness: 80 });
    const h2 = createTestHorse({
      id: "h-2",
      name: "B",
      healthStatus: "recovering",
      activeInjury: injury,
      fitness: 30,
    });
    const h3 = createTestHorse({ id: "h-3", name: "C", healthStatus: "recovering", fitness: 50 });
    seedHorses([h1, h2, h3]);

    const { result } = renderHook(() => useVetReport());
    expect(result.current.summary.total).toBe(3);
    expect(result.current.summary.healthy).toBe(1);
    expect(result.current.summary.injured).toBe(1);
    expect(result.current.summary.recovering).toBe(1);
    expect(result.current.summary.needsAttention).toBe(2);
    expect(result.current.summary.avgFitness).toBeCloseTo(53.33, 1);
  });
});
