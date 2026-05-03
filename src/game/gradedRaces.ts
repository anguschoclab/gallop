// Curated list of notable North American graded stakes races.
// Source: Wikipedia – List of American and Canadian Graded races.
// Distances normalized to meters (rounded to nearest 100m).
// dayOfYear approximates the historical running date and is used to
// schedule the race annually inside the game's yearly cycle (year = 365 days).

import type { Sex } from "./types";

export type Grade = "G1" | "G2" | "G3";

export type GradedRace = {
  key: string;
  name: string;
  track: string;
  grade: Grade;
  distance: number; // meters
  surface: "Dirt" | "Turf" | "Synthetic";
  purse: number;
  dayOfYear: number; // 1-365
  restrictions?: {
    minAge?: number;
    maxAge?: number;
    sex?: Sex; // F = fillies/mares only, M = colts/geldings only
  };
};

// Approximate scheduling day within a 365-day calendar year.
function doy(month: number, day: number): number {
  const cumulative = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return cumulative[month - 1] + day;
}

export const GRADED_RACES: GradedRace[] = [
  // ============= TRIPLE CROWN & MAJOR 3YO =============
  { key: "kentucky-derby", name: "Kentucky Derby", track: "Churchill Downs", grade: "G1", distance: 2000, surface: "Dirt", purse: 5000000, dayOfYear: doy(5, 4), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "preakness", name: "Preakness Stakes", track: "Pimlico", grade: "G1", distance: 1900, surface: "Dirt", purse: 2000000, dayOfYear: doy(5, 18), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "belmont", name: "Belmont Stakes", track: "Belmont Park", grade: "G1", distance: 2400, surface: "Dirt", purse: 2000000, dayOfYear: doy(6, 8), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "kentucky-oaks", name: "Kentucky Oaks", track: "Churchill Downs", grade: "G1", distance: 1800, surface: "Dirt", purse: 1500000, dayOfYear: doy(5, 3), restrictions: { minAge: 3, maxAge: 3, sex: "F" } },
  { key: "travers", name: "Travers Stakes", track: "Saratoga", grade: "G1", distance: 2000, surface: "Dirt", purse: 1250000, dayOfYear: doy(8, 24), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "haskell", name: "Haskell Invitational", track: "Monmouth Park", grade: "G1", distance: 1800, surface: "Dirt", purse: 1000000, dayOfYear: doy(7, 20), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "santa-anita-derby", name: "Santa Anita Derby", track: "Santa Anita", grade: "G1", distance: 1800, surface: "Dirt", purse: 750000, dayOfYear: doy(4, 6), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "florida-derby", name: "Florida Derby", track: "Gulfstream Park", grade: "G1", distance: 1800, surface: "Dirt", purse: 1000000, dayOfYear: doy(4, 1), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "arkansas-derby", name: "Arkansas Derby", track: "Oaklawn Park", grade: "G1", distance: 1800, surface: "Dirt", purse: 1250000, dayOfYear: doy(4, 13), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "blue-grass", name: "Blue Grass Stakes", track: "Keeneland", grade: "G1", distance: 1800, surface: "Dirt", purse: 1000000, dayOfYear: doy(4, 8), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "wood-memorial", name: "Wood Memorial", track: "Aqueduct", grade: "G2", distance: 1800, surface: "Dirt", purse: 750000, dayOfYear: doy(4, 6), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "queens-plate", name: "Queen's Plate", track: "Woodbine", grade: "G1", distance: 2000, surface: "Synthetic", purse: 1000000, dayOfYear: doy(8, 17), restrictions: { minAge: 3, maxAge: 3 } },

  // ============= HANDICAPS / OLDER HORSES =============
  { key: "pegasus-world-cup", name: "Pegasus World Cup", track: "Gulfstream Park", grade: "G1", distance: 1800, surface: "Dirt", purse: 3000000, dayOfYear: doy(1, 25), restrictions: { minAge: 4 } },
  { key: "santa-anita-handicap", name: "Santa Anita Handicap", track: "Santa Anita", grade: "G1", distance: 2000, surface: "Dirt", purse: 600000, dayOfYear: doy(3, 1), restrictions: { minAge: 4 } },
  { key: "donn", name: "Pegasus Donn Stakes", track: "Gulfstream Park", grade: "G1", distance: 1800, surface: "Dirt", purse: 500000, dayOfYear: doy(2, 1), restrictions: { minAge: 4 } },
  { key: "metropolitan", name: "Metropolitan Handicap", track: "Belmont Park", grade: "G1", distance: 1600, surface: "Dirt", purse: 1000000, dayOfYear: doy(6, 8), restrictions: { minAge: 4 } },
  { key: "stephen-foster", name: "Stephen Foster Stakes", track: "Churchill Downs", grade: "G1", distance: 1800, surface: "Dirt", purse: 750000, dayOfYear: doy(6, 29), restrictions: { minAge: 4 } },
  { key: "whitney", name: "Whitney Stakes", track: "Saratoga", grade: "G1", distance: 1800, surface: "Dirt", purse: 1000000, dayOfYear: doy(8, 3), restrictions: { minAge: 4 } },
  { key: "woodward", name: "Woodward Stakes", track: "Saratoga", grade: "G1", distance: 1800, surface: "Dirt", purse: 750000, dayOfYear: doy(9, 1), restrictions: { minAge: 4 } },
  { key: "jockey-club-gold-cup", name: "Jockey Club Gold Cup", track: "Saratoga", grade: "G1", distance: 2000, surface: "Dirt", purse: 1000000, dayOfYear: doy(9, 1), restrictions: { minAge: 4 } },
  { key: "awesome-again", name: "Awesome Again Stakes", track: "Santa Anita", grade: "G1", distance: 1800, surface: "Dirt", purse: 300000, dayOfYear: doy(9, 28), restrictions: { minAge: 4 } },

  // ============= TURF =============
  { key: "arlington-million", name: "Arlington Million", track: "Arlington", grade: "G1", distance: 2000, surface: "Turf", purse: 1000000, dayOfYear: doy(8, 11) },
  { key: "manhattan", name: "Manhattan Stakes", track: "Belmont Park", grade: "G1", distance: 2000, surface: "Turf", purse: 1000000, dayOfYear: doy(6, 8), restrictions: { minAge: 4 } },
  { key: "united-nations", name: "United Nations Stakes", track: "Monmouth Park", grade: "G1", distance: 2200, surface: "Turf", purse: 500000, dayOfYear: doy(7, 20) },
  { key: "joe-hirsch", name: "Joe Hirsch Turf Classic", track: "Belmont", grade: "G1", distance: 2400, surface: "Turf", purse: 750000, dayOfYear: doy(10, 6) },
  { key: "sword-dancer", name: "Sword Dancer Stakes", track: "Saratoga", grade: "G1", distance: 2400, surface: "Turf", purse: 1000000, dayOfYear: doy(8, 24) },
  { key: "secretariat", name: "Secretariat Stakes", track: "Arlington", grade: "G1", distance: 2000, surface: "Turf", purse: 400000, dayOfYear: doy(8, 11), restrictions: { minAge: 3, maxAge: 3 } },

  // ============= SPRINTS =============
  { key: "carter", name: "Carter Handicap", track: "Aqueduct", grade: "G1", distance: 1400, surface: "Dirt", purse: 500000, dayOfYear: doy(4, 6), restrictions: { minAge: 4 } },
  { key: "vosburgh", name: "Vosburgh Stakes", track: "Belmont", grade: "G2", distance: 1200, surface: "Dirt", purse: 300000, dayOfYear: doy(10, 6) },
  { key: "alfred-vanderbilt", name: "Alfred G. Vanderbilt Handicap", track: "Saratoga", grade: "G1", distance: 1200, surface: "Dirt", purse: 350000, dayOfYear: doy(7, 27) },
  { key: "forego", name: "Forego Stakes", track: "Saratoga", grade: "G1", distance: 1400, surface: "Dirt", purse: 600000, dayOfYear: doy(8, 31) },

  // ============= FILLIES & MARES =============
  { key: "personal-ensign", name: "Personal Ensign Stakes", track: "Saratoga", grade: "G1", distance: 1800, surface: "Dirt", purse: 600000, dayOfYear: doy(8, 24), restrictions: { minAge: 3, sex: "F" } },
  { key: "ogden-phipps", name: "Ogden Phipps Stakes", track: "Belmont", grade: "G1", distance: 1700, surface: "Dirt", purse: 500000, dayOfYear: doy(6, 8), restrictions: { minAge: 4, sex: "F" } },
  { key: "acorn", name: "Acorn Stakes", track: "Belmont", grade: "G1", distance: 1600, surface: "Dirt", purse: 500000, dayOfYear: doy(6, 8), restrictions: { minAge: 3, maxAge: 3, sex: "F" } },
  { key: "alabama", name: "Alabama Stakes", track: "Saratoga", grade: "G1", distance: 2000, surface: "Dirt", purse: 600000, dayOfYear: doy(8, 17), restrictions: { minAge: 3, maxAge: 3, sex: "F" } },
  { key: "coaching-club", name: "Coaching Club American Oaks", track: "Saratoga", grade: "G1", distance: 1800, surface: "Dirt", purse: 500000, dayOfYear: doy(7, 21), restrictions: { minAge: 3, maxAge: 3, sex: "F" } },
  { key: "spinster", name: "Spinster Stakes", track: "Keeneland", grade: "G1", distance: 1800, surface: "Dirt", purse: 600000, dayOfYear: doy(10, 6), restrictions: { minAge: 3, sex: "F" } },

  // ============= BREEDERS' CUP (early November) =============
  { key: "bc-classic", name: "Breeders' Cup Classic", track: "Host Track", grade: "G1", distance: 2000, surface: "Dirt", purse: 6000000, dayOfYear: doy(11, 2), restrictions: { minAge: 3 } },
  { key: "bc-turf", name: "Breeders' Cup Turf", track: "Host Track", grade: "G1", distance: 2400, surface: "Turf", purse: 5000000, dayOfYear: doy(11, 2), restrictions: { minAge: 3 } },
  { key: "bc-distaff", name: "Breeders' Cup Distaff", track: "Host Track", grade: "G1", distance: 1800, surface: "Dirt", purse: 2000000, dayOfYear: doy(11, 1), restrictions: { minAge: 3, sex: "F" } },
  { key: "bc-mile", name: "Breeders' Cup Mile", track: "Host Track", grade: "G1", distance: 1600, surface: "Turf", purse: 2000000, dayOfYear: doy(11, 2), restrictions: { minAge: 3 } },
  { key: "bc-sprint", name: "Breeders' Cup Sprint", track: "Host Track", grade: "G1", distance: 1200, surface: "Dirt", purse: 2000000, dayOfYear: doy(11, 2), restrictions: { minAge: 3 } },
  { key: "bc-juvenile", name: "Breeders' Cup Juvenile", track: "Host Track", grade: "G1", distance: 1700, surface: "Dirt", purse: 2000000, dayOfYear: doy(11, 1), restrictions: { minAge: 2, maxAge: 2 } },
  { key: "bc-juvenile-fillies", name: "Breeders' Cup Juvenile Fillies", track: "Host Track", grade: "G1", distance: 1700, surface: "Dirt", purse: 2000000, dayOfYear: doy(11, 1), restrictions: { minAge: 2, maxAge: 2, sex: "F" } },
  { key: "bc-fm-turf", name: "Breeders' Cup Filly & Mare Turf", track: "Host Track", grade: "G1", distance: 2200, surface: "Turf", purse: 2000000, dayOfYear: doy(11, 2), restrictions: { minAge: 3, sex: "F" } },
];
