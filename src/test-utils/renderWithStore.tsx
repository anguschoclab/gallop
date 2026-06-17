// src/test-utils/renderWithStore.tsx
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { useGame } from "@/game/store";
import { createDefaultGameState } from "@/game/store/state";
import type { GameState } from "@/game/types";

/**
 * Reset the real store to default data (preserving action methods) with optional
 * field overrides. Merge semantics: never pass replace=true or the slices'
 * action methods are wiped.
 *
 * @param overrides - partial GameState fields to set for the test
 */
export function seedStore(overrides: Partial<GameState> = {}): void {
  useGame.setState({ ...createDefaultGameState(), ...overrides });
}

/**
 * Render a component against the REAL Zustand store (no vi.mock of @/game/store).
 * This exercises useSyncExternalStore, so an unstable selector throws
 * "Maximum update depth exceeded" instead of silently passing.
 *
 * @param ui - the element to render
 * @param overrides - partial GameState fields to seed before rendering
 * @returns the Testing Library render result
 */
export function renderWithStore(
  ui: ReactElement,
  overrides: Partial<GameState> = {},
): RenderResult {
  seedStore(overrides);
  return render(ui);
}
