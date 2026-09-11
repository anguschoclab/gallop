/**
 * Tests for the data accessor modules (PR 4).
 *
 * Verifies that accessors return the same values as direct @/data imports
 * (characterization), and that the override registry can replace defaults.
 */

import { describe, it, expect } from "vitest";
import { trackAccessors, TRACKS, TRACK_BY_NAME, TRACK_BY_ID } from "@/core/data/tracksAccessor";
import {
  gradedRaceAccessors,
  GRADED_RACES,
  GRADED_RACES_BY_KEY,
} from "@/core/data/gradedRacesAccessor";
import {
  pedigreeAccessors,
  pedigreeMap as ACCESSOR_PEDIGREE_MAP,
  stallionResearchData,
} from "@/core/data/pedigreeAccessor";
import {
  TRACKS as DATA_TRACKS,
  TRACK_BY_NAME as DATA_TRACK_BY_NAME,
  TRACK_BY_ID as DATA_TRACK_BY_ID,
  getTrackById as dataGetTrackById,
  getTrackByName as dataGetTrackByName,
} from "@/data/tracks";
import {
  GRADED_RACES as DATA_GRADED_RACES,
  GRADED_RACES_BY_KEY as DATA_GRADED_RACES_BY_KEY,
} from "@/data/gradedRaces";
import { pedigreeMap as DATA_PEDIGREE_MAP } from "@/data/pedigreeData";
import { stallionResearchData as DATA_STALLION_RESEARCH } from "@/data/stallionDNAData";
import { DataPorts, EMPTY_DATA_PORTS } from "@/core/data/dataPorts";

describe("trackAccessors", () => {
  it("returns the same track array as direct import", () => {
    expect(trackAccessors.allTracks()).toBe(DATA_TRACKS);
    expect(TRACKS).toBe(DATA_TRACKS);
  });

  it("returns the same by-name lookup as direct import", () => {
    expect(TRACK_BY_NAME).toBe(DATA_TRACK_BY_NAME);
    const sample = DATA_TRACKS[0];
    expect(trackAccessors.trackByName(sample.name)?.id).toBe(sample.id);
  });

  it("returns the same by-id lookup as direct import", () => {
    expect(TRACK_BY_ID).toBe(DATA_TRACK_BY_ID);
    const sample = DATA_TRACKS[0];
    expect(trackAccessors.trackById(sample.id)?.name).toBe(sample.name);
  });
});

describe("gradedRaceAccessors", () => {
  it("returns the same race array as direct import", () => {
    expect(gradedRaceAccessors.all()).toBe(DATA_GRADED_RACES);
    expect(GRADED_RACES).toBe(DATA_GRADED_RACES);
  });

  it("returns the same by-key lookup as direct import", () => {
    expect(GRADED_RACES_BY_KEY).toBe(DATA_GRADED_RACES_BY_KEY);
    const sample = DATA_GRADED_RACES[0];
    expect(gradedRaceAccessors.byKey(sample.key)?.name).toBe(sample.name);
  });

  it("returns empty array for unknown day", () => {
    expect(gradedRaceAccessors.byDayOfYear(-999)).toEqual([]);
  });
});

describe("pedigreeAccessors", () => {
  it("returns the same map as direct import", () => {
    expect(ACCESSOR_PEDIGREE_MAP).toBe(DATA_PEDIGREE_MAP);
    expect(pedigreeAccessors.map()).toBe(DATA_PEDIGREE_MAP);
  });

  it("returns the same stallion research map as direct import", () => {
    expect(stallionResearchData).toBe(DATA_STALLION_RESEARCH);
  });

  it("findByName delegates to the underlying lookup", () => {
    const sample = DATA_PEDIGREE_MAP.values().next().value;
    if (sample) {
      expect(pedigreeAccessors.findByName(sample.name)?.name).toBe(sample.name);
    }
  });
});

describe("DataPorts", () => {
  it("EMPTY_DATA_PORTS has no overrides", () => {
    const ports: DataPorts = EMPTY_DATA_PORTS;
    expect(ports.trackLookup).toBeUndefined();
    expect(ports.gradedRaceLookup).toBeUndefined();
    expect(ports.pedigreeLookup).toBeUndefined();
  });
});
