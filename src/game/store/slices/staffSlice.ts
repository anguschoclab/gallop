import { generateUUID } from "@/core/uuid";
import type { SliceCreator } from "../types";

export type StaffSlice = {
  /** Flag a staff pool member as offended after a walk-away negotiation */
  flagStaffOffended: (staffId: string, until: number) => void;
  /** Hire a staff member at a negotiated salary and enqueue the intent */
  hireAtNegotiatedSalary: (staffId: string, agreedSalary: number) => { ok: boolean; reason?: string };
};

export const createStaffSlice: SliceCreator<StaffSlice> = (set, get) => ({
  flagStaffOffended: (staffId, until) => {
    set((state: any) => ({
      staffPool: (state.staffPool ?? []).map((s: any) =>
        s.id === staffId
          ? { ...s, offended: true, offendedUntil: until, negotiationRounds: 0 }
          : s,
      ),
    }));
  },

  hireAtNegotiatedSalary: (staffId, agreedSalary) => {
    const s = get();
    const staff = (s.staffPool ?? []).find((m: any) => m.id === staffId);
    if (!staff) return { ok: false, reason: "staff_not_found" };
    if (s.cash < agreedSalary) return { ok: false, reason: "insufficient_funds" };

    get().enqueueIntent({
      id: generateUUID(),
      entityId: staffId,
      source: "player",
      day: s.day,
      priority: 100,
      type: "staff",
      action: "hire",
      stableId: "",
      staffId,
      role: staff.role,
      tier: staff.tier,
      salary: agreedSalary,
    } as any);

    return { ok: true };
  },
});
