/**
 * investorTypes.ts — Player-facing syndication investor model.
 *
 * Investors have personalities that shape their expectations and reactions
 * to a syndicated stallion's on-track and financial performance.
 */

export type InvestorPersonality = "conservative" | "aggressive" | "speculator";

export type ExpectationKind = "dividend" | "prize_share" | "asset_appreciation";

export interface InvestorExpectation {
  kind: ExpectationKind;
  /** Target value the investor expects over the horizon (e.g. dollars or %). */
  target: number;
  /** Days until the check runs. */
  horizonDays: number;
  /** Day of the last evaluation. */
  lastCheckedDay?: number;
  /** Rolling met/missed history — most recent last. */
  history?: ("met" | "missed" | "exceeded")[];
}

export interface InvestorRecord {
  id: string;
  syndicateId: string;
  name: string;
  stableId: import("@/core/types/branded").OwnerKey; // "player" or an npc stable id
  personality: InvestorPersonality;
  shares: number;
  investedCash: number;
  joinedDay: number;
  satisfaction: number; // 0-100
  expectations: InvestorExpectation[];
}

export const INVESTOR_PERSONALITY_META: Record<
  InvestorPersonality,
  { label: string; blurb: string; color: string }
> = {
  conservative: {
    label: "Conservative",
    blurb: "Wants steady dividends and a healthy stud book. Hates volatility.",
    color: "#4b9cd3",
  },
  aggressive: {
    label: "Aggressive",
    blurb: "Chasing prize money and G1 wins. Rewards ambition, punishes stagnation.",
    color: "#e76f51",
  },
  speculator: {
    label: "Speculator",
    blurb: "In it for asset appreciation. Wants the share price up and out.",
    color: "#c084fc",
  },
};

const FIRST_NAMES = [
  "Ada",
  "Miles",
  "Otto",
  "Vera",
  "Ines",
  "Ren",
  "Kade",
  "Sana",
  "Bryn",
  "Lior",
  "Iris",
  "Cato",
  "Nadia",
  "Jules",
  "Rowan",
];
const LAST_NAMES = [
  "Vance",
  "Okafor",
  "Marlowe",
  "Sinclair",
  "Bellamy",
  "Amari",
  "Hollis",
  "Blackwood",
  "Cortez",
  "Duran",
  "Wren",
  "Aoki",
  "Marchetti",
];

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

export function generateInvestorName(rng?: () => number): string {
  const r = rng ?? Math.random;
  return `${pick(FIRST_NAMES, r)} ${pick(LAST_NAMES, r)}`;
}

export function pickPersonality(rng?: () => number): InvestorPersonality {
  const r = rng ?? Math.random;
  const roll = r();
  if (roll < 0.4) return "conservative";
  if (roll < 0.75) return "aggressive";
  return "speculator";
}

export function buildDefaultExpectations(
  personality: InvestorPersonality,
  shares: number,
  sharePrice: number,
): InvestorExpectation[] {
  const invested = shares * sharePrice;
  switch (personality) {
    case "conservative":
      return [
        { kind: "dividend", target: Math.round(invested * 0.08), horizonDays: 365, history: [] },
      ];
    case "aggressive":
      return [
        { kind: "prize_share", target: Math.round(invested * 0.25), horizonDays: 365, history: [] },
      ];
    case "speculator":
      return [
        {
          kind: "asset_appreciation",
          target: Math.round(sharePrice * 1.4),
          horizonDays: 365,
          history: [],
        },
      ];
  }
}
