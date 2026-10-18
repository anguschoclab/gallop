export interface NextActionInput {
  urgentMessageCount: number;
  nextOwnedRace: { id: string; day: number } | null;
  lowEnergyCount: number;
  openAuctionCount: number;
  day: number;
}

export type NextActionKind = "inbox" | "race" | "fatigue" | "auction" | "advance";

export interface NextAction {
  kind: NextActionKind;
  label: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
}

/**
 * Rank the single most important next decision for the player. Priority order:
 * urgent inbox > a race you're entered in > fatigued horses > open auction >
 * advance the day.
 *
 * @param input - derived dashboard signals
 * @returns the top-priority action (never null; falls back to advance-day)
 */
export function deriveNextAction(input: NextActionInput): NextAction {
  if (input.urgentMessageCount > 0) {
    return {
      kind: "inbox",
      label: "Review urgent messages",
      detail: `${input.urgentMessageCount} need your attention`,
      to: "/inbox",
    };
  }

  if (input.nextOwnedRace) {
    return {
      kind: "race",
      label: "Go to race day",
      detail: `Your runner is entered on Day ${input.nextOwnedRace.day}`,
      to: "/race/$raceId",
      params: { raceId: input.nextOwnedRace.id },
    };
  }

  if (input.lowEnergyCount > 0) {
    return {
      kind: "fatigue",
      label: "Rest fatigued horses",
      detail: `${input.lowEnergyCount} ${input.lowEnergyCount === 1 ? "horse is" : "horses are"} low on energy`,
      to: "/stable",
    };
  }

  if (input.openAuctionCount > 0) {
    return {
      kind: "auction",
      label: "Visit the sales ring",
      detail: `${input.openAuctionCount} auction${input.openAuctionCount === 1 ? "" : "s"} open`,
      to: "/auction",
    };
  }

  return {
    kind: "advance",
    label: "Advance to the next day",
    detail: "Nothing needs your attention — move the season forward",
    to: "/",
  };
}
