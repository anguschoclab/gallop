import type { Rng } from "@/core/common/rng";

type GrammarRule = Record<string, string[]>;

const GRAMMAR: GrammarRule = {
  lead_change_sentence: [
    "{subject_clause} {verb_clause} {context_clause}",
    "{context_clause}, {subject_clause} {verb_clause}",
  ],
  stretch_sentence: [
    "{subject_clause} {verb_clause} {context_clause}",
    "{context_clause} — {subject_clause} {verb_clause}",
  ],
  finish_sentence: [
    "{subject_clause} {verb_clause} {context_clause}!",
    "{context_clause}, {subject_clause} {verb_clause}!",
  ],
  subject_clause: ["{horse}", "The {coat} {gender}", "{jockey} on {horse}"],
  verb_clause: [
    "takes the lead",
    "hits the front",
    "seizes the initiative",
    "asserts at the front",
    "moves to the lead",
    "powers to the front",
  ],
  context_clause: [
    "with a bold move",
    "on the outside",
    "between horses",
    "with authority",
    "in a decisive thrust",
    "with a sweeping run",
  ],
};

const EVENT_GRAMMAR_KEY: Record<string, string> = {
  LEAD_CHANGE: "lead_change_sentence",
  STRETCH: "stretch_sentence",
  FINISH: "finish_sentence",
};

const BANNED_PHRASES = ["very very", "really really", "the the", "a a"];
const MAX_LENGTH = 200;

function expandRule(rule: string, rng: Rng, depth: number = 0): string {
  if (depth > 5) return rule;

  let result = rule;
  const placeholderRegex = /\{(\w+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(result)) !== null) {
    const key = match[1];
    const alternatives = GRAMMAR[key];
    if (alternatives) {
      const replacement = alternatives[Math.floor(rng.next() * alternatives.length)];
      const expanded = expandRule(replacement, rng, depth + 1);
      result = result.replace(match[0], expanded);
      placeholderRegex.lastIndex = 0;
    }
  }

  return result;
}

function capitalizeFirst(text: string): string {
  if (text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function containsBannedPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * Generate a procedural narrative beat.
 * @param eventType
 * @param rng
 * @returns The generated string
 */
export function generateProcedural(eventType: string, rng: Rng): string {
  const grammarKey = EVENT_GRAMMAR_KEY[eventType];
  if (!grammarKey) return "";

  const templates = GRAMMAR[grammarKey];
  const template = templates[Math.floor(rng.next() * templates.length)];

  let sentence = expandRule(template, rng);
  sentence = capitalizeFirst(sentence.trim());

  if (sentence.length > MAX_LENGTH) {
    sentence = sentence.substring(0, MAX_LENGTH - 1).trim() + ".";
  }

  if (containsBannedPhrase(sentence)) {
    return "";
  }

  return sentence;
}
