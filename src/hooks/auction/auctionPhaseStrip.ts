import type { ChantPhase } from "@/game/auction/runner";

export const PHASES: { key: ChantPhase | "sold_passed"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "bidding", label: "Bidding" },
  { key: "going_once", label: "Going Once" },
  { key: "going_twice", label: "Going Twice" },
  { key: "sold_passed", label: "Sold / Passed" },
];

/**
 * Maps an auction chant phase to its corresponding index for display.
 *
 * @param chant - The current auction chant phase
 * @returns The zero-based index of the phase
 */
export function chantToPhaseIndex(chant: ChantPhase | undefined): number {
  switch (chant) {
    case "open":
      return 0;
    case "bidding":
      return 1;
    case "going_once":
      return 2;
    case "going_twice":
      return 3;
    case "sold":
    case "passed":
      return 4;
    default:
      return 0;
  }
}
