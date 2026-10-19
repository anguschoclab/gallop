import type { PersonIdentity } from "@/domains/person/model/types";

export function getPersonDisplayName(person?: PersonIdentity | null): string {
  return person?.biography?.displayName ?? "Unknown";
}
