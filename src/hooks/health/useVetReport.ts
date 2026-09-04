import { useMemo, useState } from "react";
import { useGame } from "@/game/store";
import type { Horse } from "@/game/types";

export type VetStatus = "healthy" | "recovering" | "injured";
export type VetStatusColor = "green" | "yellow" | "red";

export interface VetReportRow {
  horseId: string;
  horseName: string;
  healthStatus: Horse["healthStatus"];
  activeInjury?: Horse["activeInjury"];
  fitness: number;
  fatigue: number;
  recoveryDays: number;
  status: VetStatus;
  statusColor: VetStatusColor;
}

export interface VetReportSummary {
  total: number;
  healthy: number;
  recovering: number;
  injured: number;
  needsAttention: number;
  avgFitness: number;
}

export type VetSortBy = "status" | "name" | "fitness";

export interface UseVetReportOptions {
  sortBy?: VetSortBy;
}

export interface UseVetReportResult {
  rows: VetReportRow[];
  summary: VetReportSummary;
}

function classifyHorse(horse: Horse): {
  status: VetStatus;
  color: VetStatusColor;
  recoveryDays: number;
} {
  if (horse.activeInjury) {
    return { status: "injured", color: "red", recoveryDays: horse.activeInjury.recoveryDays };
  }
  if (
    horse.healthStatus === "recovering" ||
    horse.healthStatus === "covering_sickness" ||
    horse.healthStatus === "other_illness"
  ) {
    return { status: "recovering", color: "yellow", recoveryDays: 0 };
  }
  return { status: "healthy", color: "green", recoveryDays: 0 };
}

const STATUS_PRIORITY: Record<VetStatus, number> = { injured: 0, recovering: 1, healthy: 2 };

export function useVetReport(options?: UseVetReportOptions): UseVetReportResult {
  const horses = useGame((s) => s.horses);
  const sortBy = options?.sortBy ?? "status";

  const rows = useMemo<VetReportRow[]>(() => {
    const allHorses = Object.values(horses);
    const mapped = allHorses.map((horse) => {
      const cls = classifyHorse(horse);
      return {
        horseId: horse.id,
        horseName: horse.name,
        healthStatus: horse.healthStatus,
        activeInjury: horse.activeInjury,
        fitness: horse.fitness ?? 0,
        fatigue: horse.fatigue ?? 0,
        recoveryDays: cls.recoveryDays,
        status: cls.status,
        statusColor: cls.color,
      };
    });

    if (sortBy === "status") {
      mapped.sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
    } else if (sortBy === "name") {
      mapped.sort((a, b) => a.horseName.localeCompare(b.horseName));
    } else if (sortBy === "fitness") {
      mapped.sort((a, b) => a.fitness - b.fitness);
    }

    return mapped;
  }, [horses, sortBy]);

  const summary = useMemo<VetReportSummary>(() => {
    const total = rows.length;
    const healthy = rows.filter((r) => r.status === "healthy").length;
    const injured = rows.filter((r) => r.status === "injured").length;
    const recovering = rows.filter((r) => r.status === "recovering").length;
    const needsAttention = injured + recovering;
    const avgFitness = total > 0 ? rows.reduce((sum, r) => sum + r.fitness, 0) / total : 0;
    return { total, healthy, recovering, injured, needsAttention, avgFitness };
  }, [rows]);

  return { rows, summary };
}
