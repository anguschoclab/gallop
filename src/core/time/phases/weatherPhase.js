"use strict";
/**
 * weatherPhase.ts — Daily weather simulation phase.
 *
 * Runs between marketPhase (50) and racesPhase (60). For every track that
 * appears in upcoming races (or already has a buffer), this phase:
 *   1. Steps the Markov weather sim forward one day.
 *   2. Appends to the rolling 14-day buffer at `state.weather.byTrack[trackId]`.
 *   3. Regenerates the 7-day forecast at `state.weather.forecast[trackId]`.
 *   4. For races scheduled today, calls `calculateConditionChange` and writes
 *      `race.trackCondition` + `race.weather` so downstream race resolution
 *      sees the updated track surface.
 *   5. Pushes an actionable inbox notification when a Group/Graded race day sees a
 *      pattern severity jump ≥2 vs the prior day.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.weatherPhase = void 0;
var weather_1 = require("@/core/weather");
var weatherSlice_1 = require("@/game/store/slices/weatherSlice");
var trackConditions_1 = require("@/core/trackConditions");
var uuid_1 = require("@/core/uuid");
/** Map a Race trackId; falls back to graded.trackId or graded.track. */
function raceTrackId(race) {
    var _a, _b, _c, _d;
    return (_c = (_a = race.trackId) !== null && _a !== void 0 ? _a : (_b = race.graded) === null || _b === void 0 ? void 0 : _b.trackId) !== null && _c !== void 0 ? _c : (_d = race.graded) === null || _d === void 0 ? void 0 : _d.track;
}
/** Map sim pattern → legacy `Weather` enum used on Race.weather. */
function toRaceWeather(pattern) {
    switch (pattern) {
        case "clear":
            return "sunny";
        case "overcast":
            return "cloudy";
        case "shower":
        case "rain":
            return "rainy";
        case "storm":
            return "rainy";
    }
}
exports.weatherPhase = {
    name: "weather",
    order: 55, // Between market (50) and races (60)
    execute: function (context) {
        var _a, _b, _c, _d, _e;
        var state = context.state, newDay = context.newDay;
        // Collect every trackId that needs weather: existing buffers + upcoming
        // races within the forecast horizon.
        var existing = ((_b = (_a = state.weather) === null || _a === void 0 ? void 0 : _a.byTrack) !== null && _b !== void 0 ? _b : {});
        var trackIds = new Set(Object.keys(existing));
        for (var _i = 0, _f = state.races; _i < _f.length; _i++) {
            var race = _f[_i];
            if (race.resolved)
                continue;
            if (race.day < newDay || race.day > newDay + weatherSlice_1.WEATHER_FORECAST_DAYS)
                continue;
            var tid = raceTrackId(race);
            if (tid)
                trackIds.add(tid);
        }
        if (trackIds.size === 0)
            return context;
        var newByTrack = __assign({}, existing);
        var newForecast = {};
        var newLogs = [];
        var newImpacts = [];
        var _loop_1 = function (trackId) {
            var climate = (0, weather_1.getTrackClimate)(trackId);
            var buf = (_c = newByTrack[trackId]) !== null && _c !== void 0 ? _c : [];
            var lastState = buf[buf.length - 1];
            // Step today's weather (skip if already recorded — idempotent).
            var today = lastState && lastState.day === newDay ? lastState : undefined;
            if (!today) {
                today = (0, weather_1.stepWeather)(lastState, trackId, newDay, climate);
                var nextBuf = __spreadArray(__spreadArray([], buf, true), [today], false).slice(-weatherSlice_1.WEATHER_HISTORY_DAYS);
                newByTrack[trackId] = nextBuf;
            }
            else {
                newByTrack[trackId] = buf;
            }
            // Regenerate 7-day forecast.
            newForecast[trackId] = (0, weather_1.generateForecast)(today, trackId, newDay + 1, weatherSlice_1.WEATHER_FORECAST_DAYS, climate);
            // Drama: pattern severity jump ≥2 vs prior day on a Group/Graded race day.
            if (lastState && lastState.day === newDay - 1) {
                var jump = weather_1.PATTERN_SEVERITY[today.pattern] - weather_1.PATTERN_SEVERITY[lastState.pattern];
                if (jump >= 2) {
                    var dramaRace = state.races.find(function (r) {
                        var _a;
                        return !r.resolved &&
                            r.day === newDay &&
                            ((_a = r.graded) === null || _a === void 0 ? void 0 : _a.grade) &&
                            raceTrackId(r) === trackId;
                    });
                    if (dramaRace) {
                        var dramaText = "".concat(today.pattern === "storm" ? "Storm" : "Heavy weather", " forecast at ").concat((_e = (_d = dramaRace.graded) === null || _d === void 0 ? void 0 : _d.track) !== null && _e !== void 0 ? _e : trackId, " \u2014 track downgraded ahead of the ").concat(dramaRace.name, ".");
                        newLogs.push({
                            day: newDay,
                            text: dramaText,
                        });
                        // Push to Inbox
                        newImpacts.push({
                            id: (0, uuid_1.generateUUID)(),
                            intentId: "",
                            day: newDay,
                            phase: "weather",
                            logLevel: "always",
                            type: "inbox_message",
                            message: {
                                day: newDay,
                                category: "system",
                                priority: "action",
                                title: "Weather Alert",
                                body: dramaText,
                                cta: {
                                    label: "View Race",
                                    route: "race.$raceId",
                                    params: { raceId: dramaRace.id },
                                },
                            },
                        });
                    }
                }
            }
        };
        for (var _g = 0, trackIds_1 = trackIds; _g < trackIds_1.length; _g++) {
            var trackId = trackIds_1[_g];
            _loop_1(trackId);
        }
        // Update race conditions for races scheduled today using the new weather.
        var updatedRaces = state.races.map(function (race) {
            var _a, _b, _c;
            if (race.resolved || race.day !== newDay)
                return race;
            var tid = raceTrackId(race);
            if (!tid)
                return race;
            var todays = (_a = newByTrack[tid]) === null || _a === void 0 ? void 0 : _a.slice(-1)[0];
            if (!todays)
                return race;
            var racesAtTrackToday = state.races.filter(function (r) { return r.day === newDay && raceTrackId(r) === tid; }).length;
            var prevCondition = (_b = race.trackCondition) !== null && _b !== void 0 ? _b : "good";
            var nextCondition = (0, trackConditions_1.calculateConditionChange)(prevCondition, (0, weather_1.toTrackWeatherPattern)(todays.pattern), Math.max(1, racesAtTrackToday), 0.5);
            return __assign(__assign({}, race), { trackCondition: nextCondition, weather: (_c = race.weather) !== null && _c !== void 0 ? _c : toRaceWeather(todays.pattern) });
        });
        return __assign(__assign({}, context), { state: __assign(__assign(__assign(__assign({}, state), { races: updatedRaces }), {
                weather: { byTrack: newByTrack, forecast: newForecast },
            }), { log: newLogs.length
                    ? __spreadArray(__spreadArray([], newLogs, true), state.log, true).slice(0, 200)
                    : state.log }), impacts: __spreadArray(__spreadArray([], context.impacts, true), newImpacts, true) });
    },
};
