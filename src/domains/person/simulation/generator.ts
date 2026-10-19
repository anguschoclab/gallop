/**
 * person/simulation/generator.ts - Deterministic person identity generation
 *
 * Creates embedded PersonIdentity records for owners, jockeys, and staff.
 * Portrait DNA is derived from a dedicated RNG seeded from the host ID so
 * cosmetic choices never perturb gameplay RNG streams.
 */

import { createRng, hashStr } from "@/shared/common/rng";
import type { Rng } from "@/shared/common/rng";
import type {
  PersonIdentity,
  PersonBiography,
  PersonAppearanceDNA,
  PersonRole,
  PersonPronouns,
  PersonPresentation,
  PersonAgeBand,
} from "@/domains/person/model/types";

export const PERSON_SCHEMA_VERSION = 1;
export const PERSON_ASSET_PACK_VERSION = 1;

export const PERSON_ROLES: PersonRole[] = [
  "owner",
  "jockey",
  "trainer",
  "veterinarian",
  "farrier",
  "nutritionist",
  "groom",
];

export const PERSON_PRESENTATIONS: PersonPresentation[] = ["masculine", "feminine", "neutral"];
export const PERSON_PRONOUNS: PersonPronouns[] = ["he/him", "she/her", "they/them"];

// Manifest IDs — stable strings so reordering does not change generated faces.
const FACE_BASES = ["oval", "round", "square", "heart", "long", "angular"];
const SKIN_TONES = [
  "#f8e3d2",
  "#f0d0b0",
  "#e8b890",
  "#d49a6a",
  "#b07a4a",
  "#8b5a32",
  "#5d3a1f",
  "#c98e63",
  "#a66b43",
];
const HAIR_STYLES = [
  "short-crop",
  "side-part",
  "slick-back",
  "curly-short",
  "wavy-medium",
  "ponytail",
  "bun",
  "braided",
  "buzz",
  "long-wavy",
  "top-knot",
  "afro-texture",
];
const HAIR_COLORS = [
  "#0a0a0a",
  "#1f1208",
  "#3b2410",
  "#5a3a1c",
  "#8a5a2b",
  "#b8823a",
  "#d9a441",
  "#6b6b6b",
  "#a52a2a",
  "#d2691e",
];
const EYES = ["almond", "round", "hooded", "deep-set", "wide"];
const EYE_COLORS = ["#3a2a14", "#1a1a1a", "#2c5a3a", "#2a4a7a", "#5a3a1c", "#708090"];
const BROWS = ["thin", "medium", "thick", "bushy", "arched"];
const NOSES = ["straight", "broad", "narrow", "button", "strong", "snub"];
const MOUTHS = ["neutral", "smile", "firm", "wide", "small"];
const EARS = ["small", "medium", "large", "close", "protruding"];
const FACIAL_HAIRS = ["none", "stubble", "moustache", "goatee", "full-beard", "sideburns"];
const EYEWEARS = ["none", "round-glasses", "aviators", "sport-goggles"];
const HEADWEARS = ["none", "cap", "beret", "wide-brim", "knit-cap"];
const BODIES = ["slim", "medium", "broad", "compact", "tall"];
const ACCESSORIES = ["none", "watch", "scarf", "badge", "clipboard", "binoculars", "whip-crop"];
const AGE_OVERLAYS = ["none", "light-lines", "mature-lines", "senior-lines", "silver-temples"];

function pickId<T extends string>(rng: Rng, ids: readonly T[]): T {
  return rng.pick(ids);
}

function pickOptionalId<T extends string>(
  rng: Rng,
  ids: readonly T[],
  noneWeight = 0.15,
): T | null {
  if (rng.next() < noneWeight) return null;
  return rng.pick(ids);
}

function derivePersonRng(hostId: string, revision: number): Rng {
  return createRng(hashStr(`person:${hostId}:${revision}:${PERSON_ASSET_PACK_VERSION}`));
}

function generateBiography(
  rng: Rng,
  displayName: string,
  role: PersonRole,
  ageBand: PersonAgeBand,
): PersonBiography {
  const presentation = rng.pick(PERSON_PRESENTATIONS);
  let pronouns: PersonPronouns;
  if (presentation === "masculine")
    pronouns = rng.next() < 0.85 ? "he/him" : rng.pick(PERSON_PRONOUNS);
  else if (presentation === "feminine")
    pronouns = rng.next() < 0.85 ? "she/her" : rng.pick(PERSON_PRONOUNS);
  else pronouns = rng.pick(PERSON_PRONOUNS);

  const currentYear = 2026;
  let birthYear: number;
  switch (ageBand) {
    case "young":
      birthYear = currentYear - rng.int(18, 28);
      break;
    case "adult":
      birthYear = currentYear - rng.int(29, 45);
      break;
    case "mature":
      birthYear = currentYear - rng.int(46, 60);
      break;
    case "senior":
      birthYear = currentYear - rng.int(61, 80);
      break;
  }

  return {
    displayName,
    birthYear,
    pronouns,
    presentation,
  };
}

function generateAppearanceDNA(rng: Rng): PersonAppearanceDNA {
  return {
    schemaVersion: PERSON_SCHEMA_VERSION,
    assetPackVersion: PERSON_ASSET_PACK_VERSION,
    seed: rng.int(0, 2_147_483_647),
    revision: 0,
    faceBaseId: pickId(rng, FACE_BASES),
    skinToneId: pickId(rng, SKIN_TONES),
    hairId: pickId(rng, HAIR_STYLES),
    hairColorId: pickId(rng, HAIR_COLORS),
    eyeId: pickId(rng, EYES),
    eyeColorId: pickId(rng, EYE_COLORS),
    browId: pickId(rng, BROWS),
    noseId: pickId(rng, NOSES),
    mouthId: pickId(rng, MOUTHS),
    earId: pickId(rng, EARS),
    facialHairId: pickOptionalId(rng, FACIAL_HAIRS, 0.35),
    eyewearId: pickOptionalId(rng, EYEWEARS, 0.75),
    headwearId: pickOptionalId(rng, HEADWEARS, 0.6),
    bodyId: pickId(rng, BODIES),
    accessoryId: pickOptionalId(rng, ACCESSORIES, 0.55),
    ageOverlayId: pickOptionalId(rng, AGE_OVERLAYS, 0.45),
  };
}

export interface GenerateIdentityOptions {
  id: string;
  displayName: string;
  role: PersonRole;
  ageBand: PersonAgeBand;
  /** Optional fixed seed for previews/tests. */
  seed?: number;
}

export function generatePersonIdentity(options: GenerateIdentityOptions): PersonIdentity {
  const revision = 0;
  const rng =
    options.seed !== undefined ? createRng(options.seed) : derivePersonRng(options.id, revision);

  return {
    id: options.id,
    biography: generateBiography(rng, options.displayName, options.role, options.ageBand),
    appearance: generateAppearanceDNA(rng),
  };
}

export function rerollPersonAppearance(identity: PersonIdentity): PersonIdentity {
  const nextRevision = identity.appearance.revision + 1;
  const rng = derivePersonRng(identity.id, nextRevision);
  return {
    ...identity,
    appearance: {
      ...generateAppearanceDNA(rng),
      revision: nextRevision,
    },
  };
}

export function getPersonDisplayName(identity?: PersonIdentity | null): string {
  return identity?.biography.displayName ?? "Unknown";
}

export function getPersonAge(day: number, identity?: PersonIdentity | null): number {
  if (!identity) return 0;
  const currentYear = 2026 + Math.floor((day - 1) / 365);
  return Math.max(0, currentYear - identity.biography.birthYear);
}

export function getPersonAgeBand(age: number): PersonAgeBand {
  if (age < 25) return "young";
  if (age < 45) return "adult";
  if (age < 60) return "mature";
  return "senior";
}
