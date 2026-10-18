import { describe, expect, it } from "vitest";
import { GAME_PHASE_DESCRIPTORS } from "@/platform/time/phases/descriptors";
import { SimulationExecutor } from "@/platform/time/executor";
import { createInitialState } from "@/platform/game/store/initialization";
import type { GameState } from "@/platform/game/types";
import type { PipelineContext } from "@/platform/time/pipeline";

const BASE_STATE = createInitialState();

function trackedState(
  state: GameState,
  reads: Set<keyof GameState>,
  directWrites: Set<keyof GameState>,
  proxyTargets: WeakMap<GameState, GameState>,
): GameState {
  let massCopyKeys: Set<PropertyKey> | undefined;
  const proxy = new Proxy(state, {
    get(target, property, receiver) {
      if (typeof property === "string") {
        if (massCopyKeys?.has(property)) massCopyKeys.delete(property);
        else reads.add(property as keyof GameState);
      }
      return Reflect.get(target, property, receiver);
    },
    ownKeys(target) {
      massCopyKeys = new Set(Reflect.ownKeys(target));
      return Reflect.ownKeys(target);
    },
    getOwnPropertyDescriptor(target, property) {
      return Reflect.getOwnPropertyDescriptor(target, property);
    },
    set(target, property, value, receiver) {
      if (typeof property === "string") directWrites.add(property as keyof GameState);
      return Reflect.set(target, property, value, receiver);
    },
    deleteProperty(target, property) {
      if (typeof property === "string") directWrites.add(property as keyof GameState);
      return Reflect.deleteProperty(target, property);
    },
  });
  proxyTargets.set(proxy, state);
  return proxy;
}

describe("phase descriptor runtime contract", () => {
  it("observes no undeclared top-level GameState reads or writes during a representative day", () => {
    const observedWrites = new Map<string, Set<keyof GameState>>();
    const observedReads = new Map<string, Set<keyof GameState>>();
    const instrumented = GAME_PHASE_DESCRIPTORS.map((descriptor) => {
      const reads = new Set<keyof GameState>();
      const directWrites = new Set<keyof GameState>();
      const proxyTargets = new WeakMap<GameState, GameState>();
      const wrapContext = (context: PipelineContext) => ({
        ...context,
        state: trackedState(context.state, reads, directWrites, proxyTargets),
      });
      return {
        ...descriptor,
        phase: {
          ...descriptor.phase,
          skipIf: descriptor.phase.skipIf
            ? (context: PipelineContext) => {
                const skipped = descriptor.phase.skipIf!(wrapContext(context));
                if (reads.size > 0) observedReads.set(descriptor.id, reads);
                return skipped;
              }
            : undefined,
          execute: (context: PipelineContext) => {
            const before = context.state;
            const observedState = trackedState(before, reads, directWrites, proxyTargets);
            const result = descriptor.phase.execute({ ...context, state: observedState });
            const after = proxyTargets.get(result.state) ?? result.state;
            const changed = new Set<keyof GameState>(directWrites);
            for (const key of Object.keys(after) as (keyof GameState)[]) {
              if (after[key] !== before[key]) changed.add(key);
            }
            if (reads.size > 0) observedReads.set(descriptor.id, reads);
            if (changed.size > 0) observedWrites.set(descriptor.id, changed);
            return { ...result, state: after };
          },
        },
      };
    });

    new SimulationExecutor(instrumented).runDayDetailed(structuredClone(BASE_STATE), 2);

    const undeclaredWrites = Array.from(observedWrites.entries()).flatMap(([phaseId, keys]) => {
      const descriptor = GAME_PHASE_DESCRIPTORS.find((d) => d.id === phaseId)!;
      const declared = new Set(descriptor.writes ?? []);
      if (declared.has("state")) return [];
      return Array.from(keys)
        .filter((key) => !declared.has(key))
        .map((key) => `${phaseId}:${key}`);
    });
    const undeclaredReads = Array.from(observedReads.entries()).flatMap(([phaseId, keys]) => {
      const descriptor = GAME_PHASE_DESCRIPTORS.find((d) => d.id === phaseId)!;
      const declared = new Set(descriptor.reads ?? []);
      return Array.from(keys)
        .filter((key) => !declared.has(key))
        .map((key) => `${phaseId}:${key}`);
    });

    expect({ undeclaredReads, undeclaredWrites }).toEqual({
      undeclaredReads: [],
      undeclaredWrites: [],
    });
  });
});
