// Canadian Grade 1 stakes races (run at Woodbine).
// Source: Wikipedia – Category:Grade 1 stakes races in Canada.
// Distances normalized to meters. dayOfYear schedules each race on the
// game's 365-day annual cycle (day 1 = Jan 1).

export type Grade = "G1" | "G2" | "G3";

export type GradedRace = {
  key: string;
  name: string;
  track: string;
  grade: Grade;
  distance: number;
  surface: "Turf" | "Dirt" | "Synthetic";
  purse: number; // CAD
  dayOfYear: number;
  restrictions?: { minAge?: number; maxAge?: number };
};

function doy(month: number, day: number): number {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return cum[month - 1] + day;
}

export const GRADED_RACES: GradedRace[] = [
  { key: "woodbine-mile", name: "Woodbine Mile", track: "Woodbine", grade: "G1", distance: 1600, surface: "Turf", purse: 1000000, dayOfYear: doy(9, 14), restrictions: { minAge: 3 } },
  { key: "ep-taylor", name: "E. P. Taylor Stakes", track: "Woodbine", grade: "G1", distance: 2000, surface: "Turf", purse: 600000, dayOfYear: doy(10, 12), restrictions: { minAge: 3 } },
  { key: "canadian-international", name: "Canadian International Stakes", track: "Woodbine", grade: "G1", distance: 2400, surface: "Turf", purse: 600000, dayOfYear: doy(10, 19), restrictions: { minAge: 3 } },
  { key: "northern-dancer-turf", name: "Northern Dancer Turf Stakes", track: "Woodbine", grade: "G1", distance: 2400, surface: "Turf", purse: 600000, dayOfYear: doy(9, 14), restrictions: { minAge: 3 } },
  { key: "highlander", name: "Highlander Stakes", track: "Woodbine", grade: "G1", distance: 1200, surface: "Turf", purse: 300000, dayOfYear: doy(7, 6), restrictions: { minAge: 3 } },
  { key: "summer-stakes", name: "Summer Stakes", track: "Woodbine", grade: "G1", distance: 1600, surface: "Turf", purse: 300000, dayOfYear: doy(9, 14), restrictions: { minAge: 2, maxAge: 2 } },
  { key: "natalma", name: "Natalma Stakes", track: "Woodbine", grade: "G1", distance: 1600, surface: "Turf", purse: 300000, dayOfYear: doy(9, 14), restrictions: { minAge: 2, maxAge: 2 } },
];
