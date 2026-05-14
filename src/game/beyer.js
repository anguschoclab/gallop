"use strict";
/**
 * beyer.ts - Beyer-style speed figure calculation
 *
 * This file provides lightweight Beyer-style speed figure calculation based on
 * finish time vs par time, with optional calibrated pars and class bonuses.
 *
 * Dependencies: ./types (Horse), ./tracks (CourseSpecification)
 * Related files: raceSim.ts (uses Beyer figures for race results), projections.ts (uses for race analysis)
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.distanceBucket = distanceBucket;
exports.parTime = parTime;
exports.beyerFigure = beyerFigure;
exports.expectedBeyer = expectedBeyer;
exports.calculateBeyerForResult = calculateBeyerForResult;
exports.detectPatternJump = detectPatternJump;
var gameConstants_1 = require("@/game/constants/gameConstants");
// Default par time (s) for an "average" winner at a given distance.
// Calibrated to the runner sim (~16-18 m/s sustained).
function defaultParTime(distance) {
    return distance / 16.7; // ~60s per 1000m
}
/**
 * Calculate distance bucket for par time calibration.
 *
 * @param distance - Race distance in meters
 * @returns Distance bucket (rounded to nearest 200m)
 */
function distanceBucket(distance) {
    return Math.max(200, Math.round(distance / 200) * 200);
}
/**
 * Calculate par time for a given distance.
 *
 * Uses calibrated pars if available, otherwise falls back to analytical default.
 * Blends with neighboring bucket data for smooth interpolation.
 *
 * @param distance - Race distance in meters
 * @param calibratedPars - Optional calibrated par times by distance bucket
 * @returns Par time in seconds
 */
function parTime(distance, calibratedPars) {
    if (calibratedPars === void 0) { calibratedPars = {}; }
    var b = distanceBucket(distance);
    // Blend: if calibration exists for this bucket, lean on it; otherwise fall
    // back to the analytical default. Also nudge toward neighboring buckets so
    // an unsampled distance still benefits from nearby data.
    var direct = calibratedPars[b];
    if (direct)
        return direct * (distance / b);
    var neighbors = [b - 200, b + 200].map(function (k) { return calibratedPars[k]; }).filter(Boolean);
    if (neighbors.length) {
        var avg = neighbors.reduce(function (s, v) { return s + v; }, 0) / neighbors.length;
        return avg * (distance / b);
    }
    return defaultParTime(distance);
}
/**
 * Calculate Beyer-style speed figure.
 *
 * Scales linearly with how far finish time beats par time, with grade/race-class uplift.
 * Output clamped to 30-125 (Beyer "Big Figs" rarely exceed 120).
 *
 * @param input - Beyer calculation parameters
 * @param input.distance - Race distance in meters
 * @param input.finishTime - Finish time in seconds
 * @param input.classBonus - Optional grade/stakes uplift
 * @param input.calibratedPars - Optional calibrated par times
 * @returns Beyer figure (30-125)
 */
function beyerFigure(_a) {
    var distance = _a.distance, finishTime = _a.finishTime, _b = _a.classBonus, classBonus = _b === void 0 ? 0 : _b, _c = _a.calibratedPars, calibratedPars = _c === void 0 ? {} : _c;
    if (!isFinite(finishTime) || finishTime <= 0)
        return 0;
    var par = parTime(distance, calibratedPars);
    // Each ~1% faster than par = ~5 Beyer points.
    var delta = (par - finishTime) / par;
    var fig = gameConstants_1.BEYER_BASE + delta * 500 + classBonus;
    return Math.max(gameConstants_1.BEYER_MIN, Math.min(gameConstants_1.BEYER_MAX, Math.round(fig)));
}
/**
 * Estimate a horse's expected Beyer at a given distance.
 *
 * Calculates expected Beyer based on current stats, form, energy, and track complexity.
 * Applies penalties for tight turns and steep gradients based on horse aptitudes.
 *
 * @param h - Horse to calculate for
 * @param distance - Race distance in meters
 * @param classBonus - Optional class bonus (0-10)
 * @param course - Optional course specification for complexity calculations
 * @param calibratedPars - Optional calibrated par times by distance bucket
 * @returns Expected Beyer figure
 */
function expectedBeyer(h, distance, classBonus, course, calibratedPars) {
    if (classBonus === void 0) { classBonus = 0; }
    if (calibratedPars === void 0) { calibratedPars = {}; }
    var formMod = 1 + h.form / 100;
    var energyMod = 0.8 + (h.energy / 100) * 0.2;
    var topSpeed = (12 + (h.stats.speed / 100) * 10) * formMod * energyMod;
    // Track Complexity Factor
    if (course) {
        // Penalize speed based on turn tightess vs cornering aptitude
        var avgRadius = course.sections
            .filter(function (s) { return s.type === "turn"; })
            .reduce(function (acc, s) { return acc + (s.radius || 300); }, 0) /
            Math.max(1, course.sections.filter(function (s) { return s.type === "turn"; }).length);
        if (avgRadius < 200) {
            var penalty = (200 - avgRadius) / 1000;
            var mitigation = (h.corneringAptitude - 1.0) * 0.5;
            topSpeed *= 1 - Math.max(0, penalty - mitigation);
        }
        // Penalize speed based on gradients vs climbing aptitude
        var maxGradient = Math.max.apply(Math, __spreadArray(__spreadArray([], course.sections.map(function (s) { return s.gradient || 0; }), false), [0], false));
        if (maxGradient > 1) {
            var penalty = maxGradient / 100;
            var mitigation = (h.climbingAptitude - 1.0) * 0.5;
            topSpeed *= 1 - Math.max(0, penalty - mitigation);
        }
    }
    // Stamina fade across last 40% of race (matches stepRunner curve).
    var staminaFactor = 0.4 + (h.stats.stamina / 100) * 0.6;
    // Average pace = 60% at top + 40% scaled by avg fade (1 + staminaFactor)/2.
    var avgPace = topSpeed * (0.6 + 0.4 * ((1 + staminaFactor) / 2));
    var finishTime = distance / Math.max(1, avgPace);
    return beyerFigure({ distance: distance, finishTime: finishTime, classBonus: classBonus, calibratedPars: calibratedPars });
}
/**
 * Calculate Beyer for a race result.
 *
 * Convenience wrapper for beyerFigure using individual parameters.
 *
 * @param distance - Race distance in meters
 * @param finishTime - Finish time in seconds
 * @param classBonus - Optional class bonus (0-10)
 * @param calibratedPars - Optional calibrated par times by distance bucket
 * @returns Beyer figure (30-125)
 */
function calculateBeyerForResult(distance, finishTime, classBonus, calibratedPars) {
    if (classBonus === void 0) { classBonus = 0; }
    if (calibratedPars === void 0) { calibratedPars = {}; }
    return beyerFigure({ distance: distance, finishTime: finishTime, classBonus: classBonus, calibratedPars: calibratedPars });
}
/**
 * Detect a "pattern jump" or "storm" event — a significant performance improvement.
 *
 * Criteria for a jump:
 * 1. New Beyer is 15+ points above the horse's historical average.
 * 2. OR New Beyer is 10+ points above career best (requires at least 2 previous starts).
 *
 * @param horse - Horse to check
 * @param newBeyer - Beyer figure from the most recent race
 * @returns Result with jumped flag and improvement margin
 */
function detectPatternJump(horse, newBeyer) {
    var beyerHistory = horse.raceHistory
        .filter(function (r) { return r.beyer !== undefined; })
        .map(function (r) { return r.beyer; });
    if (beyerHistory.length === 0)
        return { jumped: false, margin: 0 };
    var avgBeyer = beyerHistory.reduce(function (sum, b) { return sum + b; }, 0) / beyerHistory.length;
    var careerBest = Math.max.apply(Math, beyerHistory);
    var jumpOverAvg = newBeyer - avgBeyer;
    var jumpOverBest = newBeyer - careerBest;
    // Pattern Jump logic: 15+ over average OR 10+ over career high (if established)
    if (jumpOverAvg >= 15 || (beyerHistory.length >= 2 && jumpOverBest >= 10)) {
        return { jumped: true, margin: Math.max(jumpOverAvg, jumpOverBest) };
    }
    return { jumped: false, margin: 0 };
}
