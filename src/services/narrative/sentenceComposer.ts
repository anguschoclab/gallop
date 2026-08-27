import type { Rng } from "@/core/common/rng";

export interface SentencePlan {
  subject: string;
  verb: string;
  modifier?: string;
  condition?: string;
  trailing?: string;
}

const SUBJECTS = ["{horse}", "The {coat} {gender}", "The {stable} runner"];

const VERBS: Record<string, string[]> = {
  surge: [
    "is flying",
    "is accelerating",
    "is finding another gear",
    "is making a decisive move",
    "is quickening impressively",
    "is sweeping forward",
  ],
  fade: [
    "is weakening",
    "is losing ground",
    "is coming under pressure",
    "is starting to labour",
    "is fading from the picture",
    "is struggling to hold their position",
  ],
  fly: [
    "is travelling superbly",
    "is on the bridle",
    "is cantering along",
    "is going effortlessly",
    "is moving like a dream",
    "is full of running",
  ],
};

const MODIFIERS = [
  "brilliantly",
  "with purpose",
  "with real authority",
  "under a fierce ride",
  "with devastating effect",
  "in style",
];

const CONDITIONS = [
  "through the gap",
  "on the outside",
  "along the rail",
  "between horses",
  "with a clear run",
  "switching to the stands side",
];

const TRAILINGS = [
  "— what a move!",
  "— the crowd is on their feet!",
  "— this is special stuff!",
  "— a moment of sheer class!",
  "— you can't take your eyes off this!",
  "",
];

const EVENT_VERB_KEY: Record<string, keyof typeof VERBS> = {
  SURGE: "surge",
  FADE: "fade",
  FLYING: "fly",
};

/**
 * Compose sentence
 * @param eventType
 * @param rng
 * @returns generated sentence
 */
export function composeSentence(eventType: string, rng: Rng): string {
  const verbKey = EVENT_VERB_KEY[eventType];
  if (!verbKey) return "";

  const subject = SUBJECTS[Math.floor(rng.next() * SUBJECTS.length)];
  const verbs = VERBS[verbKey];
  const verb = verbs[Math.floor(rng.next() * verbs.length)];
  const modifier = MODIFIERS[Math.floor(rng.next() * MODIFIERS.length)];
  const condition = CONDITIONS[Math.floor(rng.next() * CONDITIONS.length)];
  const trailing = TRAILINGS[Math.floor(rng.next() * TRAILINGS.length)];

  const parts: string[] = [subject, verb];

  if (rng.next() < 0.5) {
    parts.push(modifier);
  }

  if (rng.next() < 0.4) {
    parts.push(condition);
  }

  let sentence = parts.join(" ");

  const firstLetter = sentence.charAt(0).toUpperCase();
  sentence = firstLetter + sentence.slice(1);

  if (trailing) {
    sentence += " " + trailing;
  }

  return sentence;
}
