"use strict";
/**
 * rng.ts - Seeded RNG for reproducible gameplay
 *
 * This file provides seeded RNG used by race simulation, foal generation, and any
 * other gameplay code that needs to be reproducible from a deterministic input.
 * Uses the mulberry32 algorithm for small, well-distributed game RNG.
 *
 * Dependencies: None (self-contained functions)
 * Related files: Used throughout the codebase for deterministic random generation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRng = createRng;
exports.hashStr = hashStr;
exports.nondeterministicRng = nondeterministicRng;
/**
 * Create a seeded random number generator.
 *
 * Uses the mulberry32 algorithm for deterministic random number generation.
 * Replays of the same race or pregnancy must produce identical outcomes.
 *
 * @param seed - Seed value (number or string)
 * @returns RNG interface with next, int, range, pick, and gauss methods
 */
function createRng(seed) {
    var seedNum = typeof seed === "string" ? hashStr(seed) : seed;
    var state = seedNum | 0 || 1;
    var next = function () {
        state = (state + 0x6d2b79f5) | 0;
        var t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        next: next,
        int: function (min, max) { return Math.floor(next() * (max - min + 1)) + min; },
        range: function (min, max) { return min + next() * (max - min); },
        pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
        gauss: function (mean, sd) {
            if (mean === void 0) { mean = 0; }
            if (sd === void 0) { sd = 1; }
            // Box-Muller, single sample. Avoids storing spare in state so callers
            // can interleave with int/range without surprising correlations.
            var u = Math.max(1e-12, next());
            var v = next();
            return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
        },
    };
}
/**
 * Hash a string to a 32-bit integer using FNV-1a algorithm.
 *
 * Stable hash for deriving a seed from a string id.
 *
 * @param s - String to hash
 * @returns 32-bit hash value
 */
function hashStr(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
/**
 * Create a non-deterministic RNG for fallback paths.
 *
 * Convenience for fallback paths that genuinely don't need determinism
 * (e.g. ad-hoc market refresh). Keep these rare — explicit seeds are better.
 *
 * @returns RNG interface with random seed
 */
function nondeterministicRng() {
    return createRng((Math.random() * 0xffffffff) | 0);
}
