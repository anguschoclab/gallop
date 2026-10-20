import type { Jockey } from "@/domains/jockey/model/types";
import { getPersonDisplayName } from "@/domains/person/model/displayName";

export function getJockeyName(jockey?: Jockey | null): string {
  if (!jockey) return "Unknown Jockey";
  // Older records may only carry the legacy `name` field.
  if (!jockey.person?.biography?.displayName && jockey.name) return jockey.name;
  return getPersonDisplayName(jockey.person);
}

export function getJockeyAge(day: number, jockey?: Jockey | null): number {
  if (!jockey) return 0;
  const birthYear = jockey.person.biography.birthYear;
  const currentYear = 2025 + Math.floor((day - 1) / 365);
  return Math.max(16, currentYear - birthYear);
}
