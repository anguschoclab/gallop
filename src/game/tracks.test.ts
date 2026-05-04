import { describe, it, expect } from "vitest";
import {
  TRACKS,
  TRACK_BY_NAME,
  TRACK_BY_ID,
  getTrackByName,
  getTrackById,
  getCountryByTrackName,
} from "./tracks";

describe("Tracks Data Helpers", () => {
  it("should have valid data in TRACKS array", () => {
    expect(TRACKS.length).toBeGreaterThan(0);
    expect(TRACKS[0]).toHaveProperty("id");
    expect(TRACKS[0]).toHaveProperty("name");
    expect(TRACKS[0]).toHaveProperty("country");
    expect(TRACKS[0]).toHaveProperty("surfaces");
  });

  it("should correctly populate TRACK_BY_NAME map", () => {
    const woodbine = TRACK_BY_NAME["Woodbine"];
    expect(woodbine).toBeDefined();
    expect(woodbine.name).toBe("Woodbine");
    expect(woodbine.country).toBe("Canada");
  });

  it("should correctly populate TRACK_BY_ID map", () => {
    const woodbineId = TRACK_BY_NAME["Woodbine"].id;
    const track = TRACK_BY_ID[woodbineId];
    expect(track).toBeDefined();
    expect(track.name).toBe("Woodbine");
  });

  describe("getTrackByName", () => {
    it("should return the correct track for a valid name", () => {
      const track = getTrackByName("Woodbine");
      expect(track).toBeDefined();
      expect(track?.name).toBe("Woodbine");
      expect(track?.country).toBe("Canada");
    });

    it("should return undefined for an invalid track name", () => {
      const track = getTrackByName("InvalidTrackName");
      expect(track).toBeUndefined();
    });
  });

  describe("getTrackById", () => {
    it("should return the correct track for a valid ID", () => {
      const woodbineId = TRACK_BY_NAME["Woodbine"].id;
      const track = getTrackById(woodbineId);
      expect(track).toBeDefined();
      expect(track?.name).toBe("Woodbine");
    });

    it("should return undefined for an invalid track ID", () => {
      const track = getTrackById("invalid-id-format");
      expect(track).toBeUndefined();
    });
  });

  describe("getCountryByTrackName", () => {
    it("should return the correct country for a valid track name", () => {
      expect(getCountryByTrackName("Woodbine")).toBe("Canada");
      expect(getCountryByTrackName("Meydan")).toBe("UAE");
    });

    it("should return 'Other' for an invalid track name", () => {
      expect(getCountryByTrackName("InvalidTrackName")).toBe("Other");
    });
  });
});
