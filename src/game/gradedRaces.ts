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
  purse: number;
  dayOfYear: number;
  restrictions?: { minAge?: number; maxAge?: number };
  note?: string; // e.g. "Fillies & Mares" — display-only
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

  // ============= UAE — Group 1 (Meydan, Dubai World Cup Carnival/Night) =============
  { key: "jebel-hatta", name: "Jebel Hatta", track: "Meydan", grade: "G1", distance: 1800, surface: "Turf", purse: 500000, dayOfYear: doy(1, 26), restrictions: { minAge: 4 } },
  { key: "al-maktoum-challenge", name: "Al Maktoum Challenge R3", track: "Meydan", grade: "G1", distance: 2000, surface: "Dirt", purse: 500000, dayOfYear: doy(1, 26), restrictions: { minAge: 4 } },
  { key: "al-quoz-sprint", name: "Al Quoz Sprint", track: "Meydan", grade: "G1", distance: 1200, surface: "Turf", purse: 1500000, dayOfYear: doy(3, 30), restrictions: { minAge: 3 } },
  { key: "dubai-golden-shaheen", name: "Dubai Golden Shaheen", track: "Meydan", grade: "G1", distance: 1200, surface: "Dirt", purse: 1500000, dayOfYear: doy(3, 30), restrictions: { minAge: 3 } },
  { key: "dubai-sheema-classic", name: "Dubai Sheema Classic", track: "Meydan", grade: "G1", distance: 2400, surface: "Turf", purse: 6000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },
  { key: "dubai-turf", name: "Dubai Turf", track: "Meydan", grade: "G1", distance: 1800, surface: "Turf", purse: 5000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },
  { key: "dubai-world-cup", name: "Dubai World Cup", track: "Meydan", grade: "G1", distance: 2000, surface: "Dirt", purse: 12000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },

  // ============= UAE — Group 2 =============
  { key: "al-fahidi-fort", name: "Al Fahidi Fort", track: "Meydan", grade: "G2", distance: 1400, surface: "Turf", purse: 250000, dayOfYear: doy(1, 12), restrictions: { minAge: 4 } },
  { key: "al-rashidiya", name: "Al Rashidiya", track: "Meydan", grade: "G2", distance: 1800, surface: "Turf", purse: 250000, dayOfYear: doy(1, 19), restrictions: { minAge: 4 } },
  { key: "balanchine", name: "Balanchine", track: "Meydan", grade: "G2", distance: 1800, surface: "Turf", purse: 250000, dayOfYear: doy(1, 26), restrictions: { minAge: 4 }, note: "Fillies & Mares" },
  { key: "cape-verdi", name: "Cape Verdi", track: "Meydan", grade: "G2", distance: 1600, surface: "Turf", purse: 250000, dayOfYear: doy(1, 12), restrictions: { minAge: 4 }, note: "Fillies & Mares" },
  { key: "dubai-city-of-gold", name: "Dubai City of Gold", track: "Meydan", grade: "G2", distance: 2400, surface: "Turf", purse: 250000, dayOfYear: doy(3, 9), restrictions: { minAge: 4 } },
  { key: "dubai-gold-cup", name: "Dubai Gold Cup", track: "Meydan", grade: "G2", distance: 3200, surface: "Turf", purse: 1000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },
  { key: "godolphin-mile", name: "Godolphin Mile", track: "Meydan", grade: "G2", distance: 1600, surface: "Dirt", purse: 1000000, dayOfYear: doy(3, 30), restrictions: { minAge: 4 } },
  { key: "al-maktoum-mile", name: "Al Maktoum Mile", track: "Meydan", grade: "G2", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: doy(2, 9), restrictions: { minAge: 4 } },
  { key: "al-maktoum-classic", name: "Al Maktoum Classic R2", track: "Meydan", grade: "G2", distance: 1900, surface: "Dirt", purse: 350000, dayOfYear: doy(2, 9), restrictions: { minAge: 4 } },
  { key: "meydan-sprint", name: "Meydan Sprint", track: "Meydan", grade: "G2", distance: 1000, surface: "Turf", purse: 200000, dayOfYear: doy(3, 9), restrictions: { minAge: 3 } },
  { key: "singspiel-stakes", name: "Singspiel Stakes", track: "Meydan", grade: "G2", distance: 1800, surface: "Turf", purse: 200000, dayOfYear: doy(2, 16), restrictions: { minAge: 4 } },
  { key: "uae-derby", name: "UAE Derby", track: "Meydan", grade: "G2", distance: 1900, surface: "Dirt", purse: 1000000, dayOfYear: doy(3, 30), restrictions: { minAge: 3, maxAge: 3 } },
  { key: "zabeel-mile", name: "Zabeel Mile", track: "Meydan", grade: "G2", distance: 1600, surface: "Turf", purse: 200000, dayOfYear: doy(2, 16), restrictions: { minAge: 3 } },

  // ============= UAE — Group 3 =============
  { key: "abu-dhabi-championship", name: "Abu Dhabi Championship", track: "Abu Dhabi", grade: "G3", distance: 2200, surface: "Turf", purse: 200000, dayOfYear: doy(2, 23), restrictions: { minAge: 4 } },
  { key: "al-shindagha-sprint", name: "Al Shindagha Sprint", track: "Meydan", grade: "G3", distance: 1200, surface: "Dirt", purse: 175000, dayOfYear: doy(1, 26), restrictions: { minAge: 3 } },
  { key: "burj-nahaar", name: "Burj Nahaar", track: "Meydan", grade: "G3", distance: 1600, surface: "Dirt", purse: 200000, dayOfYear: doy(3, 9), restrictions: { minAge: 4 } },
  { key: "dubai-millennium-stakes", name: "Dubai Millennium Stakes", track: "Meydan", grade: "G3", distance: 2000, surface: "Turf", purse: 175000, dayOfYear: doy(3, 9), restrictions: { minAge: 4 } },
  { key: "dubawi-stakes", name: "Dubawi Stakes", track: "Meydan", grade: "G3", distance: 1200, surface: "Dirt", purse: 175000, dayOfYear: doy(1, 12), restrictions: { minAge: 3 } },
  { key: "firebreak-stakes", name: "Firebreak Stakes", track: "Meydan", grade: "G3", distance: 1600, surface: "Dirt", purse: 175000, dayOfYear: doy(2, 9), restrictions: { minAge: 4 } },
  { key: "jebel-ali-mile", name: "Jebel Ali Mile", track: "Jebel Ali", grade: "G3", distance: 1600, surface: "Dirt", purse: 200000, dayOfYear: doy(3, 2), restrictions: { minAge: 4 } },
  { key: "mahab-al-shimaal", name: "Mahab Al Shimaal", track: "Meydan", grade: "G3", distance: 1200, surface: "Dirt", purse: 200000, dayOfYear: doy(3, 9), restrictions: { minAge: 3 } },
  { key: "nad-al-sheba-trophy", name: "Nad Al Sheba Trophy", track: "Meydan", grade: "G3", distance: 2810, surface: "Turf", purse: 200000, dayOfYear: doy(3, 9), restrictions: { minAge: 4 } },
  { key: "nad-al-sheba-turf-sprint", name: "Nad Al Sheba Turf Sprint", track: "Meydan", grade: "G3", distance: 1200, surface: "Turf", purse: 175000, dayOfYear: doy(1, 19), restrictions: { minAge: 3 } },
  { key: "uae-oaks", name: "UAE Oaks", track: "Meydan", grade: "G3", distance: 1900, surface: "Dirt", purse: 250000, dayOfYear: doy(2, 16), restrictions: { minAge: 3, maxAge: 3 }, note: "Fillies" },
  { key: "uae-2000-guineas", name: "UAE 2000 Guineas", track: "Meydan", grade: "G3", distance: 1600, surface: "Dirt", purse: 250000, dayOfYear: doy(2, 9), restrictions: { minAge: 3, maxAge: 3 } },
];
