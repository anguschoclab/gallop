"use strict";
/**
 * tracks.ts - Track data and schedule management
 *
 * This file provides track data including track specifications (sections, surfaces,
 * dimensions), track schedule configuration for realistic race day patterns, and
 * lookup utilities for track data.
 *
 * Dependencies: ./types (Race), ./uuid (generateUUID), ./trackSchedulesData (TRACK_SCHEDULES), ./data/tracks.json (TRACK_DATA)
 * Related files: raceSchedule.ts (uses track schedules), raceGeneration/raceGen.ts (uses track data)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACK_SCHEDULES = exports.TRACK_BY_ID = exports.TRACK_BY_NAME = exports.TRACKS = void 0;
exports.getTrackByName = getTrackByName;
exports.getTrackById = getTrackById;
exports.getCountryByTrackName = getCountryByTrackName;
exports.getCourseSpec = getCourseSpec;
exports.getCourseForRace = getCourseForRace;
var trackSchedulesData_1 = require("./trackSchedulesData");
Object.defineProperty(exports, "TRACK_SCHEDULES", { enumerable: true, get: function () { return trackSchedulesData_1.TRACK_SCHEDULES; } });
var tracks_json_1 = require("./data/tracks.json");
// All tracks with their UUIDs
exports.TRACKS = tracks_json_1.default;
// Lookup maps
exports.TRACK_BY_NAME = Object.fromEntries(exports.TRACKS.map(function (t) { return [t.name, t]; }));
exports.TRACK_BY_ID = Object.fromEntries(exports.TRACKS.map(function (t) { return [t.id, t]; }));
// Helper functions
/**
 * Get track by name.
 *
 * @param name - Track name
 * @returns Track or undefined if not found
 */
function getTrackByName(name) {
    return exports.TRACK_BY_NAME[name];
}
/**
 * Get track by ID.
 *
 * @param id - Track ID
 * @returns Track or undefined if not found
 */
function getTrackById(id) {
    return exports.TRACK_BY_ID[id];
}
/**
 * Get country by track name.
 *
 * @param name - Track name
 * @returns Country code or "Other" if track not found
 */
function getCountryByTrackName(name) {
    var track = getTrackByName(name);
    return (track === null || track === void 0 ? void 0 : track.country) || "Other";
}
/**
 * Returns the specific course specification for a track and surface.
 *
 * @param trackId - Track ID
 * @param surface - Surface type
 * @returns Course specification or undefined if not found
 */
function getCourseSpec(trackId, surface) {
    var track = getTrackById(trackId);
    return track === null || track === void 0 ? void 0 : track.courses.find(function (c) { return c.surface === surface; });
}
/**
 * Helper to get the correct course specification for a given race.
 *
 * @param race - Race object
 * @returns Course specification or undefined if not found
 */
function getCourseForRace(race) {
    var _a, _b;
    var trackId = race.trackId || ((_a = race.graded) === null || _a === void 0 ? void 0 : _a.trackId);
    var surface = race.surface || ((_b = race.graded) === null || _b === void 0 ? void 0 : _b.surface);
    if (!trackId || !surface)
        return undefined;
    return getCourseSpec(trackId, surface);
}
