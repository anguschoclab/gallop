import { describe, it, expect } from "vitest";
import { GRADED_RACES, getCountry } from "@/data/gradedRaces";
import { TRACKS, TRACK_BY_ID, TRACK_BY_NAME } from "@/data/tracks";
import { TRACK_SCHEDULES } from "@/data/trackSchedules";
import { TRACK_KOPPEN_MAP } from "@/core/weather/trackKoppenMappings";
import { getTrackHemisphere, getTrackClimate } from "@/core/weather/trackClimate";
import { REGIONS } from "@/core/calendar/regions";
import { COUNTRY_TO_REGION as AWARDS_COUNTRY_TO_REGION } from "@/core/awards/types";
import { getCountryFlag } from "@/core/common/countryFlag";
import { COUNTRY_TO_REGION as SEASONAL_COUNTRY_TO_REGION } from "@/core/weather/seasonalModifiers";

describe("Track data consistency — F1: graded race trackIds match track names", () => {
  it("every graded race trackId points to a track with the same name", () => {
    const mismatches: string[] = [];
    for (const r of GRADED_RACES) {
      if (r.track === "Various") {
        if (r.trackId !== undefined) {
          mismatches.push(`${r.key}: track="Various" but trackId=${r.trackId}`);
        }
        continue;
      }
      const track = TRACK_BY_ID[r.trackId];
      if (!track) {
        mismatches.push(`${r.key}: trackId=${r.trackId} not in tracks.json`);
      } else if (track.name !== r.track) {
        mismatches.push(`${r.key}: track="${r.track}" but trackId -> "${track.name}"`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe("Track data consistency — F2: no duplicate track names in tracks.json", () => {
  it("no two tracks in tracks.json share the same name", () => {
    const nameCount: Record<string, number> = {};
    for (const t of TRACKS) {
      nameCount[t.name] = (nameCount[t.name] ?? 0) + 1;
    }
    const dups = Object.entries(nameCount).filter(([, c]) => c > 1);
    expect(dups).toEqual([]);
  });
});

describe("Track data consistency — F3: graded race track names exist in tracks.json", () => {
  it("every graded race track name (except Various) exists in tracks.json", () => {
    const missing: string[] = [];
    for (const r of GRADED_RACES) {
      if (r.track === "Various") continue;
      if (!TRACK_BY_NAME[r.track]) {
        missing.push(r.track);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Track data consistency — F4: getCountry covers all graded race tracks", () => {
  it("getCountry returns non-Other for every graded race track", () => {
    const missing: string[] = [];
    const seen = new Set<string>();
    for (const r of GRADED_RACES) {
      if (seen.has(r.track)) continue;
      seen.add(r.track);
      if (getCountry(r.track) === "Other") {
        missing.push(r.track);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Track data consistency — F5: all countries mapped in awards/types.ts", () => {
  it("every country from getCountry is in COUNTRY_TO_REGION", () => {
    const missing: string[] = [];
    const seen = new Set<string>();
    for (const r of GRADED_RACES) {
      const country = getCountry(r.track);
      if (seen.has(country)) continue;
      seen.add(country);
      if (!AWARDS_COUNTRY_TO_REGION[country]) {
        missing.push(country);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Track data consistency — F6: all countries have flags", () => {
  it("every country from getCountry has a flag emoji", () => {
    const missing: string[] = [];
    const seen = new Set<string>();
    for (const r of GRADED_RACES) {
      const country = getCountry(r.track);
      if (seen.has(country)) continue;
      seen.add(country);
      const flag = getCountryFlag(country);
      if (flag === "🏳️") {
        missing.push(country);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Track data consistency — F7: getTrackHemisphere correctness", () => {
  it("Southern Hemisphere tracks return Southern", () => {
    const southernCountries = ["Australia", "Argentina", "Brazil", "Chile"];
    for (const track of TRACKS) {
      if (southernCountries.includes(track.country)) {
        expect(getTrackHemisphere(track.id)).toBe("Southern");
      }
    }
  });

  it("Northern Hemisphere tracks return Northern", () => {
    const northernCountries = ["USA", "Great Britain", "Japan", "France", "Germany", "Ireland"];
    for (const track of TRACKS) {
      if (northernCountries.includes(track.country)) {
        expect(getTrackHemisphere(track.id)).toBe("Northern");
      }
    }
  });

  it("undefined trackId returns Northern", () => {
    expect(getTrackHemisphere(undefined)).toBe("Northern");
  });
});

describe("Track data consistency — F8: getTrackClimate correctness", () => {
  it("returns correct climate for known Koppen codes", () => {
    // Find a track with BWh (arid) — Meydan
    const meydan = TRACKS.find((t) => t.name === "Meydan");
    expect(meydan).toBeDefined();
    expect(getTrackClimate(meydan!.id)).toBe("arid");

    // Find a track with Cfb (temperate) — Ascot
    const ascot = TRACKS.find((t) => t.name === "Ascot");
    expect(ascot).toBeDefined();
    expect(getTrackClimate(ascot!.id)).toBe("temperate");

    // Find a track with Dfb (cold) — Düsseldorf
    const dusseldorf = TRACKS.find((t) => t.name === "Düsseldorf");
    expect(dusseldorf).toBeDefined();
    expect(getTrackClimate(dusseldorf!.id)).toBe("cold");
  });

  it("undefined trackId returns temperate", () => {
    expect(getTrackClimate(undefined)).toBe("temperate");
  });
});

describe("Track data consistency — F9: all tracks have schedules", () => {
  it("every track in tracks.json has a TRACK_SCHEDULES entry", () => {
    const scheduledIds = new Set(TRACK_SCHEDULES.map((s) => s.trackId));
    const missing: string[] = [];
    for (const t of TRACKS) {
      if (!scheduledIds.has(t.id)) {
        missing.push(`${t.name} (${t.id})`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Track data consistency — F10: ghost tracks exist in tracks.json", () => {
  const ghostTracks = [
    "Monmouth Park",
    "Fair Grounds",
    "Tampa Bay Downs",
    "Lone Star Park",
    "Belmont at the Big A",
    "Eagle Farm",
    "Morphettville",
  ];

  for (const name of ghostTracks) {
    it(`${name} exists in tracks.json`, () => {
      expect(TRACK_BY_NAME[name]).toBeDefined();
    });
  }
});

describe("Track data consistency — F11: all tracks in regions.ts exist in tracks.json", () => {
  it("every track name in REGIONS exists in tracks.json", () => {
    const missing: string[] = [];
    for (const region of Object.values(REGIONS)) {
      for (const trackName of region.tracks) {
        if (!TRACK_BY_NAME[trackName]) {
          missing.push(`${trackName} (in region ${region.id})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Track data consistency — F12: all tracks in tracks.json exist in some region", () => {
  it("every track in tracks.json appears in at least one region", () => {
    const allRegionTracks = new Set<string>();
    for (const region of Object.values(REGIONS)) {
      for (const trackName of region.tracks) {
        allRegionTracks.add(trackName);
      }
    }
    const missing: string[] = [];
    for (const t of TRACKS) {
      if (!allRegionTracks.has(t.name)) {
        missing.push(t.name);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("Track data consistency — F13: no orphaned Koppen mappings", () => {
  it("every TRACK_KOPPEN_MAP key exists in tracks.json", () => {
    const trackIds = new Set(TRACKS.map((t) => t.id));
    const orphaned: string[] = [];
    for (const id of Object.keys(TRACK_KOPPEN_MAP)) {
      if (!trackIds.has(id)) {
        orphaned.push(id);
      }
    }
    expect(orphaned).toEqual([]);
  });
});

describe("Track data consistency — F14: all tracks have Koppen mappings", () => {
  it("every track in tracks.json has a TRACK_KOPPEN_MAP entry", () => {
    const missing: string[] = [];
    for (const t of TRACKS) {
      if (!TRACK_KOPPEN_MAP[t.id]) {
        missing.push(`${t.name} (${t.id})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
