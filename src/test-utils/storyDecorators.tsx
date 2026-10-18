// storyDecorators.tsx - Storybook decorators that seed the real Zustand store
// so store-coupled components render real state in stories.
import type { Decorator } from "@storybook/react";
import { useState } from "react";
import type { GameState } from "@/platform/game/types";
import { seedStore } from "./renderWithStore";

/**
 * Seed the game store before the story renders.
 * @param overrides - partial GameState fields for the story
 */
export function withGameState(overrides: Partial<GameState>): Decorator {
  return function WithGameState(Story) {
    useState(() => {
      seedStore(overrides);
      return true;
    });
    return <Story />;
  };
}
