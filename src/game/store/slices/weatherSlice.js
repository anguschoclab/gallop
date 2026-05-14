"use strict";
/**
 * weatherSlice.ts — Per-track rolling weather buffer + 7-day forecast.
 *
 * State shape on the store:
 *   weather: {
 *     byTrack: Record<trackId, WeatherState[]>;   // rolling 14-day history
 *     forecast: Record<trackId, WeatherState[]>;  // next 7 days
 *   }
 *
 * Mutations are driven by `weatherPhase` (see core/time/phases/weatherPhase).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWeatherSlice = exports.WEATHER_FORECAST_DAYS = exports.WEATHER_HISTORY_DAYS = void 0;
exports.WEATHER_HISTORY_DAYS = 14;
exports.WEATHER_FORECAST_DAYS = 7;
var createWeatherSlice = function (set, get) { return ({
    weather: { byTrack: {}, forecast: {} },
    getCurrentWeather: function (trackId) {
        var _a, _b;
        var buf = (_b = (_a = get().weather) === null || _a === void 0 ? void 0 : _a.byTrack) === null || _b === void 0 ? void 0 : _b[trackId];
        return buf && buf.length ? buf[buf.length - 1] : undefined;
    },
    getForecast: function (trackId) { var _a, _b, _c; return (_c = (_b = (_a = get().weather) === null || _a === void 0 ? void 0 : _a.forecast) === null || _b === void 0 ? void 0 : _b[trackId]) !== null && _c !== void 0 ? _c : []; },
    resetWeather: function () {
        set({ weather: { byTrack: {}, forecast: {} } });
    },
}); };
exports.createWeatherSlice = createWeatherSlice;
