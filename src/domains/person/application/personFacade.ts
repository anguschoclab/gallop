/**
 * person/application/personFacade.ts - Convenience accessors for embedded identities
 *
 * Host entities now store PersonIdentity rather than bare strings. These helpers
 * keep UI and narrative code concise while preserving the clean-break type shape.
 */

import type {
  PersonIdentity,
  PersonRole,
  PersonPresentation,
  PersonPronouns,
} from "@/domains/person/model/types";

export * from "@/domains/person/model/types";
export {
  generatePersonIdentity,
  rerollPersonAppearance,
  getPersonDisplayName,
  getPersonAge,
  getPersonAgeBand,
  PERSON_SCHEMA_VERSION,
  PERSON_ASSET_PACK_VERSION,
} from "@/domains/person/simulation/generator";

export function getIdentityName(identity?: PersonIdentity | null): string {
  return identity?.biography.displayName ?? "Unknown";
}

export function getIdentityPronouns(identity?: PersonIdentity | null): PersonPronouns {
  return identity?.biography.pronouns ?? "they/them";
}

export function getIdentityPresentation(identity?: PersonIdentity | null): PersonPresentation {
  return identity?.biography.presentation ?? "neutral";
}

export function getIdentityAge(day: number, identity?: PersonIdentity | null): number {
  if (!identity) return 0;
  const currentYear = 2026 + Math.floor((day - 1) / 365);
  return Math.max(0, currentYear - identity.biography.birthYear);
}

export function getIdentityNationality(identity?: PersonIdentity | null): string | undefined {
  return identity?.biography.nationality;
}

export function getIdentityHometown(identity?: PersonIdentity | null): string | undefined {
  return identity?.biography.hometown;
}

export function personRoleLabel(role: PersonRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "jockey":
      return "Jockey";
    case "trainer":
      return "Trainer";
    case "veterinarian":
      return "Veterinarian";
    case "farrier":
      return "Farrier";
    case "nutritionist":
      return "Nutritionist";
    case "groom":
      return "Groom";
  }
}
