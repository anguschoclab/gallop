// Auctioneer chant generation.
//
// Drives the live AuctionTheater's text feed. Templates are organized by
// event type (LOT_OPEN, BID_RECEIVED, GOING_ONCE, etc.). Each event picks
// a template at random with the seeded RNG and substitutes context.
//
// Templates can hint at quality without revealing fog-of-war stats: we use
// "buckets" derived from displayable signals (fame, scout reports,
// conformation/temperament, breeze times) — never raw potential or stats.

import type { Horse, Stable } from "@/game/types";
import type { AuctionTickEvent } from "@/game/auctionRunner";
import type { Rng } from "@/game/rng";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type AuctioneerContext = {
  horse?: Horse;
  consignor?: Stable;
  winner?: Stable;
  /** Display-safe stats (post fog-of-war). Optional fields may be undefined. */
  scoutedOverall?: number;
  /** A 1-based paddle number derived from the bidder stable index, for flavor. */
  paddleNumber?: number;
  saleHype?: number; // 0-1 — how heated the room feels (used to bias prefixes)
  /** Lot-specific signals available to the auctioneer (breeze times etc.). */
  breezeSeconds?: number;
};

export type AuctioneerLine = {
  text: string;
  isHighImpact: boolean;
};

export function generateAuctioneerLine(
  event: AuctionTickEvent,
  ctx: AuctioneerContext,
  rng: Rng,
): AuctioneerLine {
  switch (event.type) {
    case "LOT_OPEN":
      return pickLine(LOT_OPEN_TEMPLATES, ctx, rng, false);
    case "BID_RECEIVED": {
      const text = renderBidLine(event.amount, event.stableId, ctx, rng);
      return { text, isHighImpact: false };
    }
    case "BID_WAR":
      return pickLine(BID_WAR_TEMPLATES, ctx, rng, true);
    case "GOING_ONCE":
      return pickLine(GOING_ONCE_TEMPLATES, { ...ctx, amount: event.amount }, rng, false);
    case "GOING_TWICE":
      return pickLine(GOING_TWICE_TEMPLATES, { ...ctx, amount: event.amount }, rng, true);
    case "SOLD":
      return pickLine(SOLD_TEMPLATES, { ...ctx, amount: event.amount }, rng, true);
    case "PASSED":
      return pickLine(PASSED_TEMPLATES, ctx, rng, false);
    case "RESERVE_NOT_MET":
      return pickLine(
        RESERVE_NOT_MET_TEMPLATES,
        { ...ctx, amount: event.amount, reserve: event.reserve },
        rng,
        false,
      );
  }
}

// ---------------------------------------------------------------------------
// Hint helpers — buckets, never raw stats
// ---------------------------------------------------------------------------

function fameBucket(fame: number): string {
  if (fame >= 60) return "household name";
  if (fame >= 35) return "well-known";
  if (fame >= 15) return "talked-about";
  return "unknown quantity";
}

function potentialHintFromOverall(overall?: number): string | null {
  if (overall === undefined) return null;
  if (overall >= 85) return "blue-chip";
  if (overall >= 75) return "high-end";
  if (overall >= 60) return "promising";
  if (overall >= 45) return "workmanlike";
  return "modest";
}

function breezeBucket(breezeSec?: number): string | null {
  if (breezeSec === undefined) return null;
  if (breezeSec <= 9.8) return "blistering :09 and change";
  if (breezeSec <= 10.2) return "sharp :10 flat";
  if (breezeSec <= 10.6) return "honest :10 and change";
  return "workmanlike effort";
}

function pedigreeFragment(horse: Horse | undefined, rng: Rng): string | null {
  if (!horse) return null;
  const sire = horse.sireName;
  const dam = horse.damName;
  if (sire && dam) {
    const variants = [
      `by ${sire} out of ${dam}`,
      `out of ${dam}, by ${sire}`,
      `${sire} on top, ${dam} below`,
    ];
    return variants[Math.floor(rng.next() * variants.length)];
  }
  if (sire) return `by ${sire}`;
  if (dam) return `out of ${dam}`;
  return null;
}

// ---------------------------------------------------------------------------
// Template substitution
// ---------------------------------------------------------------------------

type RenderCtx = AuctioneerContext & {
  amount?: number;
  reserve?: number;
};

function substitute(template: string, ctx: RenderCtx, rng: Rng): string {
  const horse = ctx.horse;
  const stable = ctx.winner ?? ctx.consignor;

  const map: Record<string, string | undefined> = {
    horse: horse?.name,
    sire: horse?.sireName,
    dam: horse?.damName,
    coat: horse?.coatColor,
    gender: horse
      ? horse.gender === "filly" || horse.gender === "mare"
        ? "filly"
        : horse.gender === "colt" || horse.gender === "horse"
          ? "colt"
          : horse.gender
      : undefined,
    age: horse ? `${horse.age}YO` : undefined,
    conformation: horse?.conformation,
    temperament: horse?.temperament,
    runningStyle: runningStyleLabel(horse?.runningStyle),
    fameBucket: horse ? fameBucket(horse.fame) : undefined,
    potentialBucket: potentialHintFromOverall(ctx.scoutedOverall) ?? undefined,
    pedigree: pedigreeFragment(horse, rng) ?? undefined,
    blueHen: horse?.blueHenStatus?.isBlueHen ? "blue-hen" : undefined,
    stable: stable?.name,
    consignor: ctx.consignor?.name,
    winner: ctx.winner?.name,
    paddle: ctx.paddleNumber !== undefined ? `paddle ${ctx.paddleNumber}` : undefined,
    amount: ctx.amount !== undefined ? `$${ctx.amount.toLocaleString()}` : undefined,
    reserve: ctx.reserve !== undefined ? `$${ctx.reserve.toLocaleString()}` : undefined,
    breeze: breezeBucket(ctx.breezeSeconds) ?? undefined,
  };

  return template
    .replace(/\{(\w+)\}/g, (_, key) => map[key] ?? `[${key}?]`)
    .replace(/\[\w+\?\]/g, "") // Drop any unfilled tokens
    .replace(/\s+/g, " ")
    .trim();
}

function runningStyleLabel(s: Horse["runningStyle"] | undefined): string | undefined {
  if (!s) return undefined;
  return ({ E: "early speed", EP: "press the pace", P: "pace stalker", S: "deep closer" } as const)[
    s
  ];
}

function pickLine(
  templates: readonly string[],
  ctx: RenderCtx,
  rng: Rng,
  isHighImpact: boolean,
): AuctioneerLine {
  const template = templates[Math.floor(rng.next() * templates.length)];
  let text = substitute(template, ctx, rng);
  // If we substituted out a fragment (pedigree/breeze) and the sentence has
  // ", , " or trailing punctuation oddities, tidy them up.
  text = text.replace(/,\s*,/g, ",").replace(/\s+\./g, ".").trim();
  return { text, isHighImpact };
}

function renderBidLine(
  amount: number,
  stableId: string | undefined,
  ctx: AuctioneerContext,
  rng: Rng,
): string {
  const tpls = stableId ? BID_NPC_TEMPLATES : BID_PLAYER_TEMPLATES;
  return substitute(tpls[Math.floor(rng.next() * tpls.length)], { ...ctx, amount }, rng);
}

// ---------------------------------------------------------------------------
// Templates — heavy on variety
// ---------------------------------------------------------------------------

const LOT_OPEN_TEMPLATES: readonly string[] = [
  "Now in the ring — {horse}, a {coat} {age} {gender} {pedigree}.",
  "Lot up next: {horse}. {pedigree} — a {potentialBucket} prospect.",
  "Welcome {horse} to the ring, {pedigree}. Open the bidding!",
  "Here's one to watch — {horse}, {pedigree}, {fameBucket} on the grounds.",
  "{horse} steps to the block. {pedigree}. Conformation: {conformation}.",
  "A real eye-catcher here — {horse}, {pedigree}.",
  "Ladies and gentlemen, lot {horse} — {pedigree}, {potentialBucket} on paper.",
  "Take a look — {horse}, {coat}, {pedigree}. Who'll start us?",
  "{horse} comes through next — out of a {blueHen} mare. Big page.",
  "Nice individual now — {horse}, {pedigree}. Temperament rated {temperament}.",
  "From the consignment of {consignor} — {horse}, {pedigree}.",
  "Pedigree page on this one is electric — {horse}, {pedigree}.",
  "Plenty of presence on this colt — {horse}, {pedigree}.",
  "She's a beauty — {horse}, {pedigree}. Who'll open?",
  "{horse} — your classic shape, {pedigree}. Looking for a starting bid.",
  "Don't miss this one — {horse}, breezed a {breeze} the other morning.",
  "A {breeze} worker here — {horse}, {pedigree}.",
  "Workmen rate this one highly — {horse}, {pedigree}.",
  "Hip card reads {horse} — {pedigree}, {fameBucket}.",
  "And now — {horse}. {pedigree}. Build is {conformation}.",
];

const BID_NPC_TEMPLATES: readonly string[] = [
  "{amount} in the back — that's {amount}.",
  "{amount} on the rail!",
  "Got {amount} from {paddle}.",
  "{amount} bid — {amount}, looking for more.",
  "{stable} steps in at {amount}.",
  "{amount} now — {amount}.",
  "{amount}! Who's next?",
  "I've got {amount} — {amount} the bid.",
  "{amount} from {stable}, looking for the raise.",
  "{amount} — and a new high bidder.",
  "{amount} bid — anyone topping that?",
  "Now {amount} — {amount}!",
  "{amount}, on the aisle.",
  "{amount}! That's {amount}, can I get more?",
  "Up to {amount} from {paddle}.",
  "Sharp bid — {amount}.",
];

const BID_PLAYER_TEMPLATES: readonly string[] = [
  "{amount} from you — {amount} now leading.",
  "Your bid {amount} — {amount}.",
  "You step in at {amount}!",
  "{amount} — and you're in front.",
  "Bold one from you — {amount}.",
  "You take it to {amount}.",
];

const BID_WAR_TEMPLATES: readonly string[] = [
  "We have a duel here, ladies and gentlemen!",
  "Two paddles trading blows — this one's hot.",
  "The room can feel it — bids flying on {horse}.",
  "Look at the action — they want this one badly.",
  "Going back and forth on {horse} — heating up!",
];

const GOING_ONCE_TEMPLATES: readonly string[] = [
  "Going once at {amount}…",
  "{amount} — fair warning…",
  "Last call — {amount}, going once.",
  "All in at {amount}? Going once.",
  "{amount} — anywhere else?",
  "Last chance at {amount}.",
];

const GOING_TWICE_TEMPLATES: readonly string[] = [
  "Going twice…",
  "Twice — {amount}!",
  "Last warning — going twice at {amount}.",
  "Twice now — anyone, anywhere?",
  "Going twice — speak now.",
];

const SOLD_TEMPLATES: readonly string[] = [
  "SOLD! {amount} to {stable}!",
  "Hammer down — {horse} sold at {amount} to {stable}!",
  "And — SOLD to {stable} for {amount}.",
  "{horse} goes to {stable} — {amount}!",
  "That's the sale — {amount} to {stable}!",
  "Knocked down to {stable} at {amount}.",
];

const PASSED_TEMPLATES: readonly string[] = [
  "No takers on {horse} — passed.",
  "{horse} returns to the consignor — no sale.",
  "We move on — {horse} passes.",
  "Couldn't move {horse} today.",
];

const RESERVE_NOT_MET_TEMPLATES: readonly string[] = [
  "Reserve not met on {horse} — top bid {amount}, reserve {reserve}.",
  "Buyback at {amount} — reserve was {reserve}.",
  "Short of the reserve at {amount} — {horse} doesn't sell.",
  "Held back — bid {amount}, reserve {reserve}.",
];
