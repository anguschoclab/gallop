import type { Race } from "./types";
import { generateUUID } from "./uuid";

export type TrackSection = {
  type: "straight" | "turn";
  length: number; // meters
  radius?: number; // meters (for turns)
  gradient?: number; // % slope (uphill/downhill)
  banking?: number; // degrees
};

export type CourseSpecification = {
  surface: "Turf" | "Dirt" | "Synthetic";
  name?: string; // e.g. "Main Track", "Inner Turf"
  circumference: number;
  straightLength: number; // home straight length
  width?: number; // meters
  sections: TrackSection[];
};

export type Track = {
  id: string;
  name: string;
  country: string;
  courses: CourseSpecification[];
  elevation?: number; // altitude above sea level
  osmId?: string;
};

// Track schedule configuration for realistic race day patterns
export type TrackSchedule = {
  trackId: string;
  raceDays: number[]; // Day of week (0=Sunday, 6=Saturday)
  racesPerDay: [number, number]; // Min, max races per day
  meetStart?: number; // Day of year (1-365)
  meetEnd?: number; // Day of year (1-365)
  regionalSystem: "north_america" | "europe" | "australia" | "asia" | "south_america";
};

import TRACK_DATA from "./data/tracks.json";

// All tracks with their UUIDs
export const TRACKS: Track[] = TRACK_DATA as Track[];

// Lookup maps
export const TRACK_BY_NAME: Record<string, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.name, t]),
);

export const TRACK_BY_ID: Record<string, Track> = Object.fromEntries(TRACKS.map((t) => [t.id, t]));

// Helper functions
export function getTrackByName(name: string): Track | undefined {
  return TRACK_BY_NAME[name];
}

export function getTrackById(id: string): Track | undefined {
  return TRACK_BY_ID[id];
}

export function getCountryByTrackName(name: string): string {
  const track = getTrackByName(name);
  return track?.country || "Other";
}

/**
 * Returns the specific course specification for a track and surface.
 */
export function getCourseSpec(
  trackId: string,
  surface: "Turf" | "Dirt" | "Synthetic",
): CourseSpecification | undefined {
  const track = getTrackById(trackId);
  return track?.courses.find((c) => c.surface === surface);
}

/**
 * Helper to get the correct course specification for a given race.
 */
export function getCourseForRace(race: Race): CourseSpecification | undefined {
  const trackId = race.trackId || race.graded?.trackId;
  const surface = race.surface || race.graded?.surface;
  if (!trackId || !surface) return undefined;
  return getCourseSpec(trackId, surface);
}

// Track schedules - realistic race day patterns by region
export const TRACK_SCHEDULES: TrackSchedule[] = [
  // Canada - North American pattern (4-5 days/week, claiming-heavy)
  {
    trackId: "a4e790db-a9ad-458d-9191-817b61b9069c", // Woodbine
    raceDays: [4, 5, 6, 0], // Thu, Fri, Sat, Sun
    racesPerDay: [8, 10],
    meetStart: 120, // Late April
    meetEnd: 280, // Early October
    regionalSystem: "north_america",
  },
  {
    trackId: "2ba12f6e-dc0d-47e9-9c95-af87fae00890", // Fort Erie
    raceDays: [5, 6, 0], // Fri, Sat, Sun
    racesPerDay: [7, 9],
    meetStart: 150, // Late May
    meetEnd: 250, // Early September
    regionalSystem: "north_america",
  },
  {
    trackId: "98c77f6a-f5b7-4791-aac1-afe5e5969aa3", // Century Mile
    raceDays: [4, 5, 6, 0], // Thu, Fri, Sat, Sun
    racesPerDay: [7, 9],
    meetStart: 90, // Late March
    meetEnd: 300, // Late October
    regionalSystem: "north_america",
  },
  {
    trackId: "c7447323-b2df-46be-9f99-28e56a41e584", // Hastings
    raceDays: [5, 6, 0], // Fri, Sat, Sun
    racesPerDay: [7, 9],
    meetStart: 120, // Late April
    meetEnd: 280, // Early October
    regionalSystem: "north_america",
  },

  // UAE - Asia pattern (weekend racing, no claiming)
  {
    trackId: "85a3d0b8-a4a9-4ff7-bc18-705874d8da31", // Meydan
    raceDays: [4, 5], // Thu, Fri (weekend in UAE)
    racesPerDay: [8, 10],
    meetStart: 1, // January
    meetEnd: 90, // Late March
    regionalSystem: "asia",
  },
  {
    trackId: "21815495-916b-4f3f-a2d9-51a3f6640152", // Abu Dhabi
    raceDays: [4, 5], // Thu, Fri
    racesPerDay: [6, 8],
    meetStart: 1, // January
    meetEnd: 120, // Late April
    regionalSystem: "asia",
  },

  // Argentina - South America pattern (weekend racing)
  {
    trackId: "271e4541-1500-4872-9340-4ed791fd28b7", // Hipódromo de San Isidro
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [10, 12],
    meetStart: 60, // March
    meetEnd: 330, // Late November
    regionalSystem: "south_america",
  },
  {
    trackId: "1e1beb62-f786-44a9-8441-b23aa0db1eec", // Hipódromo Argentino de Palermo
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [10, 12],
    meetStart: 60, // March
    meetEnd: 330, // Late November
    regionalSystem: "south_america",
  },

  // Brazil - South America pattern
  {
    trackId: "ce7714db-fa90-4ded-8477-40eec676bb12", // Hipódromo da Gávea
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [8, 10],
    meetStart: 90, // Late March
    meetEnd: 340, // December
    regionalSystem: "south_america",
  },

  // Chile - South America pattern
  {
    trackId: "b7fef5f2-2fe4-4814-a528-fba3d6bbee01", // Valparaiso Sporting Club
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [8, 10],
    meetStart: 300, // Late October
    meetEnd: 60, // March (crosses year boundary)
    regionalSystem: "south_america",
  },

  // Scandinavia - Europe pattern (1-3 days/week, no claiming)
  {
    trackId: "2a3d24c8-10ff-4a5a-836f-cb4ed2d122dc", // Bro Park
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [6, 8],
    meetStart: 120, // Late April
    meetEnd: 280, // Early October
    regionalSystem: "europe",
  },
  {
    trackId: "60a39c4a-3c65-4ca1-98ba-7bee7a726d43", // Øvrevoll
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [6, 8],
    meetStart: 130, // May
    meetEnd: 270, // Late September
    regionalSystem: "europe",
  },

  // Japan - Asia pattern (weekend racing for JRA, midweek for NAR)
  {
    trackId: "09aea125-88e4-4e51-b8d7-0475869c6269", // Tokyo (JRA)
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [10, 12],
    meetStart: 1, // January
    meetEnd: 365, // Year-round
    regionalSystem: "asia",
  },
  {
    trackId: "7e899665-ba3d-4fa2-88ba-37d6828ec6a4", // Nakayama (JRA)
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [10, 12],
    meetStart: 1, // January
    meetEnd: 365, // Year-round
    regionalSystem: "asia",
  },
  {
    trackId: "92caacd1-e771-49a7-9fe8-0de78b3d22a5", // Kyoto (JRA)
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [10, 12],
    meetStart: 1, // January
    meetEnd: 365, // Year-round
    regionalSystem: "asia",
  },
  {
    trackId: "ddd59f86-d11f-4374-90a6-134a861f16bc", // Hanshin (JRA)
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [10, 12],
    meetStart: 1, // January
    meetEnd: 365, // Year-round
    regionalSystem: "asia",
  },
  // NAR tracks (midweek racing)
  {
    trackId: "84abb980-cc9b-4a62-b825-7b40e9079e88", // Kanazawa (NAR)
    raceDays: [1, 2, 3], // Tue, Wed, Thu
    racesPerDay: [8, 10],
    meetStart: 1, // January
    meetEnd: 365, // Year-round
    regionalSystem: "asia",
  },

  // Italy - Europe pattern
  {
    trackId: "1c52aaa3-3172-4a8c-8b10-fba1f26591a5", // Capannelle
    raceDays: [5, 6, 0], // Fri, Sat, Sun
    racesPerDay: [7, 9],
    meetStart: 60, // March
    meetEnd: 300, // Late October
    regionalSystem: "europe",
  },

  // Hong Kong - Asia pattern (weekend racing, no claiming)
  {
    trackId: "62a59b6c-0230-4db7-ab2f-fb494d6dd2ec", // Sha Tin
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [9, 11],
    meetStart: 1, // January
    meetEnd: 365, // Year-round
    regionalSystem: "asia",
  },
  {
    trackId: "352ca343-eb29-4910-bfa4-e78198d0dc8b", // Happy Valley
    raceDays: [2, 3], // Wed, Thu
    racesPerDay: [7, 9],
    meetStart: 1, // January
    meetEnd: 365, // Year-round
    regionalSystem: "asia",
  },

  // Great Britain - Europe pattern (1-3 days/week, no claiming)
  {
    trackId: "e8a9c43d-0aa9-45ba-830d-c3ab0d328cbb", // Newmarket
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [7, 9],
    meetStart: 60, // March
    meetEnd: 330, // Late November
    regionalSystem: "europe",
  },
  {
    trackId: "bf517cc6-2210-42ad-a6de-7115abc4ef08", // Ascot
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [6, 8],
    meetStart: 120, // Late April
    meetEnd: 200, // Mid-July (Royal Ascot meet)
    regionalSystem: "europe",
  },
  {
    trackId: "643f2051-687d-4112-88f1-cbbe24620cda", // Newbury
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [7, 9],
    meetStart: 60, // March
    meetEnd: 330, // Late November
    regionalSystem: "europe",
  },

  // France - Europe pattern
  {
    trackId: "38ebbdbd-9247-4085-845f-ad02896c4161", // Longchamp
    raceDays: [5, 6, 0], // Fri, Sat, Sun
    racesPerDay: [8, 10],
    meetStart: 60, // March
    meetEnd: 300, // Late October
    regionalSystem: "europe",
  },
  {
    trackId: "3991d574-f943-4a97-b234-1422ac776412", // Chantilly
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [7, 9],
    meetStart: 60, // March
    meetEnd: 300, // Late October
    regionalSystem: "europe",
  },

  // Ireland - Europe pattern
  {
    trackId: "20175183-67a8-4d6b-9c4d-0942856f8860", // Curragh
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [7, 9],
    meetStart: 60, // March
    meetEnd: 330, // Late November
    regionalSystem: "europe",
  },
  {
    trackId: "73892381-380b-4362-bc0e-b499a31efe12", // Leopardstown
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [7, 9],
    meetStart: 1, // January (National Hunt)
    meetEnd: 365, // Year-round
    regionalSystem: "europe",
  },

  // Germany - Europe pattern
  {
    trackId: "739ee5fa-588c-481c-8e8a-529291ba6644", // Baden-Baden
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [6, 8],
    meetStart: 120, // Late April
    meetEnd: 280, // Early October
    regionalSystem: "europe",
  },
  {
    trackId: "784442f3-6a95-4629-ab99-3dc564a7b71b", // Hoppegarten
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [6, 8],
    meetStart: 120, // Late April
    meetEnd: 280, // Early October
    regionalSystem: "europe",
  },

  // USA - North American pattern
  {
    trackId: "b1a2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", // Churchill Downs
    raceDays: [4, 5, 6, 0], // Thu, Fri, Sat, Sun
    racesPerDay: [9, 11],
    meetStart: 90, // Late March (Spring Meet)
    meetEnd: 180, // Late June
    regionalSystem: "north_america",
  },
  {
    trackId: "c2b3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", // Pimlico
    raceDays: [4, 5, 6, 0], // Thu-Sun
    racesPerDay: [8, 10],
    meetStart: 110, // Mid-April (Preakness meet)
    meetEnd: 165, // Mid-June
    regionalSystem: "north_america",
  },
  {
    trackId: "d3c4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", // Belmont Park
    raceDays: [4, 5, 6, 0], // Thu-Sun
    racesPerDay: [9, 11],
    meetStart: 120, // Late April
    meetEnd: 210, // Late July
    regionalSystem: "north_america",
  },
  {
    trackId: "e4d5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a", // Saratoga
    raceDays: [3, 4, 5, 6, 0], // Wed-Sun
    racesPerDay: [9, 11],
    meetStart: 200, // Late July
    meetEnd: 265, // Late September
    regionalSystem: "north_america",
  },
  {
    trackId: "f5e6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b", // Santa Anita
    raceDays: [4, 5, 6, 0], // Thu-Sun
    racesPerDay: [9, 11],
    meetStart: 1, // January
    meetEnd: 130, // Mid-May
    regionalSystem: "north_america",
  },
  {
    trackId: "a6f7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", // Keeneland
    raceDays: [4, 5, 6, 0], // Thu-Sun
    racesPerDay: [8, 10],
    meetStart: 95, // First week of April
    meetEnd: 130, // End of April (Spring meet)
    regionalSystem: "north_america",
  },
  {
    trackId: "b7a8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d", // Del Mar
    raceDays: [3, 4, 5, 6], // Wed-Sat
    racesPerDay: [8, 10],
    meetStart: 200, // Mid-July
    meetEnd: 270, // Late September
    regionalSystem: "north_america",
  },
  {
    trackId: "c8b9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e", // Aqueduct
    raceDays: [3, 5, 6, 0], // Wed, Fri-Sun
    racesPerDay: [8, 10],
    meetStart: 300, // Late October
    meetEnd: 90, // Late March (crosses year)
    regionalSystem: "north_america",
  },
  {
    trackId: "d9c0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f", // Oaklawn Park
    raceDays: [4, 5, 6, 0], // Thu-Sun
    racesPerDay: [8, 10],
    meetStart: 15, // January 15
    meetEnd: 120, // Late April
    regionalSystem: "north_america",
  },
  {
    trackId: "e0d1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a", // Gulfstream Park
    raceDays: [3, 4, 5, 6, 0], // Wed-Sun
    racesPerDay: [9, 11],
    meetStart: 1, // January
    meetEnd: 130, // Mid-May
    regionalSystem: "north_america",
  },

  // Australia - Australia pattern (weekend racing)
  {
    trackId: "a1b2c3d4-e5f6-4a7b-8c9d-1e2f3a4b5c6d", // Flemington
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [8, 10],
    meetStart: 1, // Year-round
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "b2c3d4e5-f6a7-4b8c-9d0e-2f3a4b5c6d7e", // Randwick
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [8, 10],
    meetStart: 1, // Year-round
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "c3d4e5f6-a7b8-4c9d-0e1f-3a4b5c6d7e8f", // Caulfield
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [8, 10],
    meetStart: 1, // Year-round
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "d4e5f6a7-b8c9-4d0e-1f2a-4b5c6d7e8f9a", // Moonee Valley
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [7, 9],
    meetStart: 1, // Year-round
    meetEnd: 365,
    regionalSystem: "australia",
  },
  {
    trackId: "e5f6a7b8-c9d0-4e1f-2a3b-5c6d7e8f9a0b", // Rosehill
    raceDays: [5, 6], // Sat, Sun
    racesPerDay: [8, 10],
    meetStart: 1, // Year-round
    meetEnd: 365,
    regionalSystem: "australia",
  },

  // Saudi Arabia - Asia pattern
  {
    trackId: "f6a7b8c9-d0e1-4f2a-3b4c-6d7e8f9a0b1c", // King Abdulaziz Racecourse
    raceDays: [4, 5], // Thu, Fri
    racesPerDay: [7, 9],
    meetStart: 1, // January
    meetEnd: 90, // Late March
    regionalSystem: "asia",
  },

  // Singapore - Asia pattern
  {
    trackId: "a7b8c9d0-e1f2-4a3b-4c5d-7e8f9a0b1c2d", // Kranji
    raceDays: [5, 6], // Fri, Sat
    racesPerDay: [8, 10],
    meetStart: 1, // Year-round
    meetEnd: 365,
    regionalSystem: "asia",
  },
];
