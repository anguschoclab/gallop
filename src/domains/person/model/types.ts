/**
 * person/model/types.ts - Shared person identity and portrait types
 *
 * Every named human entity in Gallop (player owner, NPC owner, jockey,
 * apprentice, staff) carries a PersonIdentity. The identity is embedded in the
 * host entity and keyed to the host's authoritative ID so race-history and
 * attribution never need a secondary registry.
 */

export type PersonRole =
  "owner" | "jockey" | "trainer" | "veterinarian" | "farrier" | "nutritionist" | "groom";

export type PersonPronouns = "he/him" | "she/her" | "they/them";

export type PersonPresentation = "masculine" | "feminine" | "neutral";

export type PersonAgeBand = "young" | "adult" | "mature" | "senior";

export interface PersonBiography {
  displayName: string;
  birthYear: number;
  nationality?: string;
  hometown?: string;
  pronouns: PersonPronouns;
  presentation: PersonPresentation;
}

export interface PersonAppearanceDNA {
  /** Version of the appearance schema itself. */
  schemaVersion: number;
  /** Version of the shipped asset pack / layer manifest. */
  assetPackVersion: number;
  /** Stable seed used for deterministic generation. */
  seed: number;
  /** Incremented on each cosmetic reroll. */
  revision: number;

  // Layer manifest selections (IDs, never array indexes)
  faceBaseId: string;
  skinToneId: string;
  hairId: string;
  hairColorId: string;
  eyeId: string;
  eyeColorId: string;
  browId: string;
  noseId: string;
  mouthId: string;
  earId: string;
  facialHairId: string | null;
  eyewearId: string | null;
  headwearId: string | null;
  bodyId: string;
  accessoryId: string | null;
  ageOverlayId: string | null;
}

export interface PersonIdentity {
  /** Host entity ID: jockey ID, staff ID, stable ID, or "player". */
  id: string;
  biography: PersonBiography;
  appearance: PersonAppearanceDNA;
}

export type PortraitContext =
  "owner-formal" | "owner-yard" | "staff" | "jockey-racewear" | "jockey-casual" | "compact";

export interface PersonPortraitRenderPlan {
  identity: PersonIdentity;
  context: PortraitContext;
  width: number;
  height: number;
  silk?: { primary: string; secondary: string; cap: string; pattern: string } | null;
  label: string;
}
