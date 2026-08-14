import { useMemo } from "react";
import type { Horse } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { horseMarketValue } from "@/core/horse/pricing";
import { formatCurrency } from "@/components/horse/HorseBits";
import {
  ENERGY_MAX,
  STAT_SCALE_MAX,
  STAT_SCALE_MIN,
  BEYER_NULL_SENTINEL,
  POSITION_WIN,
  POSITION_PLACE,
  POSITION_SHOW,
} from "@/constants/gameConstants";

export interface RowData {
  label: string;
  values: (string | number)[];
  numeric?: number[];
  higherIsBetter?: boolean;
  barValues?: number[];
}

function beyerSummary(h: Horse) {
  const beyers = h.raceHistory
    .map((r) => r.beyer)
    .filter((b): b is number => typeof b === "number");
  if (beyers.length === 0) return { min: null, avg: null, max: null };
  const min = Math.min(...beyers);
  const max = Math.max(...beyers);
  const avg = Math.round(beyers.reduce((a, b) => a + b, 0) / beyers.length);
  return { min, avg, max };
}

function careerRecord(h: Horse) {
  const starts = h.raceHistory.length;
  let wins = 0,
    places = 0,
    shows = 0,
    earnings = 0;
  for (const r of h.raceHistory) {
    if (r.position === POSITION_WIN) wins++;
    else if (r.position === POSITION_PLACE) places++;
    else if (r.position === POSITION_SHOW) shows++;
    earnings += r.purseEarned ?? 0;
  }
  return { starts, wins, places, shows, earnings };
}

export function bestIdx(nums: number[], higher: boolean): number {
  let best = 0;
  for (let i = 1; i < nums.length; i++) {
    if (higher ? nums[i] > nums[best] : nums[i] < nums[best]) best = i;
  }
  for (let i = 0; i < nums.length; i++) {
    if (i !== best && nums[i] === nums[best]) return -1;
  }
  return best;
}

export function useHorseCompareRows(horses: Horse[], allHorses: Horse[]): { rows: RowData[] } {
  const rows = useMemo<RowData[]>(() => {
    if (horses.length === 0) return [];
    const ovr = horses.map(calculateOverallRating);
    const val = horses.map((h) => horseMarketValue(h, allHorses));
    const records = horses.map(careerRecord);
    const beyers = horses.map(beyerSummary);

    return [
      {
        label: "OVR",
        values: ovr,
        numeric: ovr,
        higherIsBetter: true,
        barValues: ovr,
      },
      {
        label: "Potential",
        values: horses.map((h) => h.potential),
        numeric: horses.map((h) => h.potential),
        higherIsBetter: true,
        barValues: horses.map((h) => h.potential),
      },
      {
        label: "Energy",
        values: horses.map((h) => `${Math.round(h.energy)}/${ENERGY_MAX}`),
        numeric: horses.map((h) => h.energy),
        higherIsBetter: true,
        barValues: horses.map((h) => h.energy),
      },
      {
        label: "Form",
        values: horses.map((h) => (h.form > 0 ? `+${h.form}` : `${h.form}`)),
        numeric: horses.map((h) => h.form),
        higherIsBetter: true,
        barValues: horses.map((h) => Math.max(STAT_SCALE_MIN, Math.min(STAT_SCALE_MAX, h.form))),
      },
      {
        label: "Valuation",
        values: val.map((v) => formatCurrency(v)),
        numeric: val,
        higherIsBetter: true,
      },
      {
        label: "Career starts",
        values: records.map((r) => r.starts),
        numeric: records.map((r) => r.starts),
        higherIsBetter: true,
      },
      {
        label: "Record (W-P-S)",
        values: records.map((r) => `${r.wins}-${r.places}-${r.shows}`),
        numeric: records.map((r) => r.wins),
        higherIsBetter: true,
      },
      {
        label: "Earnings",
        values: records.map((r) => formatCurrency(r.earnings)),
        numeric: records.map((r) => r.earnings),
        higherIsBetter: true,
      },
      {
        label: "Beyer avg",
        values: beyers.map((b) => (b.avg == null ? "—" : b.avg)),
        numeric: beyers.map((b) => b.avg ?? BEYER_NULL_SENTINEL),
        higherIsBetter: true,
      },
      {
        label: "Beyer range",
        values: beyers.map((b) => (b.min == null ? "—" : `${b.min}–${b.max}`)),
      },
    ];
  }, [horses, allHorses]);

  return { rows };
}
