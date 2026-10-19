import type { StaffMember } from "@/domains/staff/model/staffTypes";
import { getPersonDisplayName } from "@/domains/person/model/displayName";

export function getStaffName(staff?: StaffMember | null): string {
  if (!staff) return "Unknown Staff";
  return getPersonDisplayName(staff.person);
}
