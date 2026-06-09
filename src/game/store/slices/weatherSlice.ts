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

import type { GameStateCreator } from "../types";
import type { WeatherState } from "@/core/weather";
import { WEATHER_HISTORY_DAYS, WEATHER_FORECAST_DAYS } from "@/constants/game";

export interface WeatherStoreState {
  weather?: {
    byTrack: Record<string, WeatherState[]>;
    forecast: Record<string, WeatherState[]>;
  };
}

export type WeatherSlice = WeatherStoreState & {
  /** Latest WeatherState recorded for the given track (or undefined). */
  getCurrentWeather: (trackId: string) => WeatherState | undefined;
  /** Forecast (next 7 days) for the given track. */
  getForecast: (trackId: string) => WeatherState[];
  /** Reset all per-track weather (used for new game / dev tools). */
  resetWeather: () => void;
};

export const createWeatherSlice: GameStateCreator<WeatherSlice> = (set, get) => ({
  weather: { byTrack: {}, forecast: {} },

  getCurrentWeather: (trackId) => {
    const buf = get().weather?.byTrack?.[trackId];
    return buf && buf.length ? buf[buf.length - 1] : undefined;
  },

  getForecast: (trackId) => get().weather?.forecast?.[trackId] ?? [],

  resetWeather: () => {
    set({ weather: { byTrack: {}, forecast: {} } } as Partial<unknown> as never);
  },
});
