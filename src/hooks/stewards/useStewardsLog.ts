import { useMemo } from "react";
import { useGame } from "@/game/store";
import type { StewardsInquiry, InquiryOutcome, InquiryType } from "@/core/stewards/stewardTypes";

const EMPTY_INQUIRIES: StewardsInquiry[] = [];

export interface UseStewardsLogFilters {
  outcome?: InquiryOutcome;
  type?: InquiryType;
  horseId?: string;
}

export interface StewardsLogSummary {
  total: number;
  resolved: number;
  pending: number;
  disqualifications: number;
}

export interface UseStewardsLogResult {
  inquiries: StewardsInquiry[];
  summary: StewardsLogSummary;
}

export function useStewardsLog(filters?: UseStewardsLogFilters): UseStewardsLogResult {
  const allInquiries = useGame((s) => s.stewardsInquiries ?? EMPTY_INQUIRIES);

  const inquiries = useMemo(() => {
    let filtered = [...allInquiries];

    if (filters?.outcome) {
      filtered = filtered.filter((i) => i.outcome === filters.outcome);
    }
    if (filters?.type) {
      filtered = filtered.filter((i) => i.type === filters.type);
    }
    if (filters?.horseId) {
      const hid = filters.horseId;
      filtered = filtered.filter((i) => i.accusedHorseId === hid || i.reportingHorseId === hid);
    }

    return filtered.sort((a, b) => b.day - a.day);
  }, [allInquiries, filters?.outcome, filters?.type, filters?.horseId]);

  const summary = useMemo<StewardsLogSummary>(() => {
    const resolved = allInquiries.filter((i) => i.status === "resolved").length;
    const pending = allInquiries.filter(
      (i) => i.status === "pending" || i.status === "reviewing",
    ).length;
    const disqualifications = allInquiries.filter(
      (i) => i.outcome === "disqualification" || i.outcome === "dq_placed_last",
    ).length;
    return {
      total: allInquiries.length,
      resolved,
      pending,
      disqualifications,
    };
  }, [allInquiries]);

  return { inquiries, summary };
}
