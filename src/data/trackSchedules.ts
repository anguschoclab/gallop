/**
 * trackSchedulesData.ts - Track schedule configuration
 *
 * This file provides track schedule data with realistic race day patterns by region,
 * including race days, races per day, meet start/end dates, and regional system.
 *
 * Dependencies: ./tracks (TrackSchedule)
 * Related files: tracks.ts (uses track schedules), raceSchedule.ts (uses schedule data)
 */

import type { TrackSchedule } from "./tracks";

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
];
