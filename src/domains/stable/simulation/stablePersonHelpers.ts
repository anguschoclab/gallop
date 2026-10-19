import type { Stable, PlayerProfile } from "@/domains/stable/simulation/types";
import { getPersonDisplayName } from "@/domains/person/model/displayName";

export function getStableOwnerName(stable?: Stable | null): string {
  if (!stable) return "Unknown";
  return getPersonDisplayName(stable.owner);
}

export function getPlayerOwnerName(profile?: PlayerProfile | null): string {
  if (!profile) return "Unknown";
  return getPersonDisplayName(profile.owner);
}
