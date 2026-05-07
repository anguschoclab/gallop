import type { ChantPhase } from "@/game/auctionRunner";

export const PHASES: { key: ChantPhase | "sold_passed"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "bidding", label: "Bidding" },
  { key: "going_once", label: "Going Once" },
  { key: "going_twice", label: "Going Twice" },
  { key: "sold_passed", label: "Sold / Passed" },
];

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
