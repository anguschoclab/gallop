/**
 * koppenClimate.test.ts - Tests for Koppen climate classification system
 *
 * Validates:
 * - All tracks have valid Koppen mappings
 * - Monthly temperature ranges match historical data
 * - Annual precipitation is realistic
 * - Southern hemisphere seasons are inverted
 */

import { describe, it, expect } from "vitest";
import { TRACK_KOPPEN_MAP, getTrackKoppen } from "@/core/weather/trackKoppenMappings";
import { KOPPEN_PROFILES } from "@/core/weather/koppenProfiles";
import { ALL_KOPPEN_CODES, KOPPEN_DESCRIPTIONS } from "@/core/weather/koppenTypes";
import TRACK_DATA from "@/game/data/tracks.json";

describe("Koppen Climate System", () => {
  describe("Track Mappings", () => {
    it("should have Koppen mappings for all tracks in tracks.json", () => {
      const missingTracks: string[] = [];
      
      for (const track of TRACK_DATA) {
        if (!TRACK_KOPPEN_MAP[track.id]) {
          missingTracks.push(`${track.name} (${track.country})`);
        }
      }
      
      expect(missingTracks).toEqual([]);
    });

    it("should have valid Koppen codes for all mapped tracks", () => {
      const invalidCodes: Array<{ trackId: string; code: string }> = [];
      
      for (const [trackId, code] of Object.entries(TRACK_KOPPEN_MAP)) {
        if (!ALL_KOPPEN_CODES.includes(code)) {
          invalidCodes.push({ trackId, code });
        }
      }
      
      expect(invalidCodes).toEqual([]);
    });

    it("should categorize tracks by country correctly", () => {
      const byCountry: Record<string, string[]> = {};
      
      for (const track of TRACK_DATA) {
        const code = getTrackKoppen(track.id);
        if (!byCountry[track.country]) {
          byCountry[track.country] = [];
        }
        byCountry[track.country].push(code);
      }
      
      // UK/Ireland should be Cfb (Temperate Oceanic)
      expect(byCountry["Great Britain"]?.every(c => c === "Cfb")).toBe(true);
      expect(byCountry["Ireland"]?.every(c => c === "Cfb")).toBe(true);
      
      // UAE/Saudi should be BWh (Hot Desert)
      expect(byCountry["UAE"]?.every(c => c === "BWh")).toBe(true);
      
      // Chile should be Csb (Warm-Summer Mediterranean)
      expect(byCountry["Chile"]?.every(c => c === "Csb")).toBe(true);
    });
  });

  describe("Climate Profiles", () => {
    it("should have all 12 months defined for every Koppen code", () => {
      for (const code of ALL_KOPPEN_CODES) {
        const profile = KOPPEN_PROFILES[code];
        expect(profile).toBeDefined();
        
        for (let month = 1; month <= 12; month++) {
          expect(profile.monthly[month]).toBeDefined();
        }
      }
    });

    it("should have realistic temperature ranges for each Koppen code", () => {
      const tempRanges: Record<string, { min: number; max: number }> = {
        Cfb: { min: -5, max: 30 },  // Oceanic - mild
        Cfa: { min: -5, max: 35 },  // Humid subtropical
        Csa: { min: 0, max: 40 },   // Mediterranean
        Csb: { min: 0, max: 35 },   // Warm Mediterranean
        BWh: { min: 10, max: 50 },  // Hot desert
        Dfb: { min: -20, max: 30 }, // Humid continental
        Dfa: { min: -20, max: 35 }, // Hot continental
        Aw: { min: 15, max: 40 },   // Tropical savanna
        Af: { min: 20, max: 35 },   // Rainforest
        BSk: { min: -10, max: 40 }, // Cold semi-arid
        ET: { min: -25, max: 25 },  // Tundra
      };

      for (const code of ALL_KOPPEN_CODES) {
        const profile = KOPPEN_PROFILES[code];
        const range = tempRanges[code];
        
        for (let month = 1; month <= 12; month++) {
          const monthly = profile.monthly[month];
          expect(monthly.avgLow).toBeGreaterThanOrEqual(range.min);
          expect(monthly.avgHigh).toBeLessThanOrEqual(range.max);
          expect(monthly.avgHigh).toBeGreaterThan(monthly.avgLow);
        }
      }
    });

    it("should have realistic precipitation patterns", () => {
      // Desert (BWh) should have very few rainy days
      const bwh = KOPPEN_PROFILES.BWh;
      const bwhTotalPrecip = Object.values(bwh.monthly).reduce((sum, m) => sum + m.precipDays, 0);
      expect(bwhTotalPrecip).toBeLessThan(15); // Less than 15 days per year

      // Rainforest (Af) should have many rainy days
      const af = KOPPEN_PROFILES.Af;
      const afTotalPrecip = Object.values(af.monthly).reduce((sum, m) => sum + m.precipDays, 0);
      expect(afTotalPrecip).toBeGreaterThan(150); // More than 150 days per year

      // Mediterranean (Csa) should have dry summers
      const csa = KOPPEN_PROFILES.Csa;
      const summerMonths = [6, 7, 8]; // Jun-Aug
      const winterMonths = [12, 1, 2]; // Dec-Feb
      
      const summerPrecip = summerMonths.reduce((sum, m) => sum + csa.monthly[m].precipDays, 0);
      const winterPrecip = winterMonths.reduce((sum, m) => sum + csa.monthly[m].precipDays, 0);
      
      expect(summerPrecip).toBeLessThan(10);
      expect(winterPrecip).toBeGreaterThan(15);
    });

    it("should have realistic humidity ranges", () => {
      for (const code of ALL_KOPPEN_CODES) {
        const profile = KOPPEN_PROFILES[code];
        
        for (let month = 1; month <= 12; month++) {
          const humidity = profile.monthly[month].humidity;
          expect(humidity).toBeGreaterThanOrEqual(0.3);
          expect(humidity).toBeLessThanOrEqual(0.9);
        }
      }
    });
  });

  describe("Hemisphere Handling", () => {
    it("should identify Chile tracks as Csb (Southern hemisphere climate)", () => {
      // Chile tracks mapped to Csb which has southern hemisphere data
      const chileTracks = [
        "b7fef5f2-2fe4-4814-a528-fba3d6bbee01", // Valparaiso
        "61a34612-26fc-4336-8c71-c3239098ee26", // Club Hípico de Santiago
        "8cd8068a-d06f-4b40-a8a7-b9d6012afd0f", // Hipódromo Chile
      ];

      for (const trackId of chileTracks) {
        const code = getTrackKoppen(trackId);
        expect(code).toBe("Csb");
        const profile = KOPPEN_PROFILES[code];
        expect(profile.hemisphere).toBe("Southern");
      }
    });

    it("should have inverted seasons for Csb (southern hemisphere)", () => {
      // Csb (Chile) should have warm summer in January
      const csb = KOPPEN_PROFILES.Csb;
      expect(csb.monthly[1].avgHigh).toBeGreaterThan(csb.monthly[7].avgHigh);
    });

    it("should map Australian tracks to appropriate Koppen codes", () => {
      // Australian tracks have different climates based on location
      // Melbourne (Flemington/Caulfield/Moonee Valley) - Cfb (Temperate Oceanic)
      // Sydney (Randwick/Rosehill) - Cfa (Humid Subtropical)
      
      expect(getTrackKoppen("a1b2c3d4-e5f6-4a7b-8c9d-1e2f3a4b5c6d")).toBe("Cfb"); // Flemington
      expect(getTrackKoppen("b2c3d4e5-f6a7-4b8c-9d0e-2f3a4b5c6d7e")).toBe("Cfa"); // Randwick
    });
  });

  describe("Climate Descriptions", () => {
    it("should have descriptions for all Koppen codes", () => {
      for (const code of ALL_KOPPEN_CODES) {
        expect(KOPPEN_DESCRIPTIONS[code]).toBeDefined();
        expect(KOPPEN_DESCRIPTIONS[code].length).toBeGreaterThan(10);
      }
    });
  });
});
