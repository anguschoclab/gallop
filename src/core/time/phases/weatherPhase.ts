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

import type { PipelineContext } from "../pipeline";
import type { Race } from "@/core/race/types";
import type { TrackCondition, Weather } from "@/game/types";
import {
  type WeatherState,
  generateForecast,
  stepWeather,
  toTrackWeatherPattern,
  PATTERN_SEVERITY,
  getTrackClimate,
  getTrackHemisphere,
} from "@/core/weather";
import { WEATHER_HISTORY_DAYS, WEATHER_FORECAST_DAYS } from "@/game/store/slices/weatherSlice";
import { calculateConditionChange } from "@/core/trackConditions";
import { generateUUID } from "@/core/uuid";

/**
 * Map a Race trackId; falls back to graded.trackId or graded.track.
 * @param race
 */
function raceTrackId(race: Race): string | undefined {
  return race.trackId ?? race.graded?.trackId ?? race.graded?.track;
}

/**
 * Map sim pattern → legacy `Weather` enum used on Race.weather.
 * @param pattern
 */
function toRaceWeather(pattern: WeatherState["pattern"]): Weather {
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

export const weatherPhase = {
  name: "weather",
  order: 55, // Between market (50) and races (60)
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay } = context;

    // Collect every trackId that needs weather: existing buffers + upcoming
    // races within the forecast horizon.
    const existing = ((state as any).weather?.byTrack ?? {}) as Record<string, WeatherState[]>;
    const trackIds = new Set<string>(Object.keys(existing));

    for (const race of state.races) {
      if (race.resolved) continue;
      if (race.day < newDay || race.day > newDay + WEATHER_FORECAST_DAYS) continue;
      const tid = raceTrackId(race);
      if (tid) trackIds.add(tid);
    }

    if (trackIds.size === 0) return context;

    const newByTrack: Record<string, WeatherState[]> = { ...existing };
    const newForecast: Record<string, WeatherState[]> = {};
    const newLogs: { day: number; text: string }[] = [];
    const newImpacts: any[] = [];

    for (const trackId of trackIds) {
      const climate = getTrackClimate(trackId);
      const hemisphere = getTrackHemisphere(trackId);
      const buf = newByTrack[trackId] ?? [];
      const lastState = buf[buf.length - 1];

      // Step today's weather (skip if already recorded — idempotent).
      let today = lastState && lastState.day === newDay ? lastState : undefined;
      if (!today) {
        today = stepWeather(lastState, trackId, newDay, climate, hemisphere);
        const nextBuf = [...buf, today].slice(-WEATHER_HISTORY_DAYS);
        newByTrack[trackId] = nextBuf;
      } else {
        newByTrack[trackId] = buf;
      }

      // Regenerate 7-day forecast.
      newForecast[trackId] = generateForecast(
        today,
        trackId,
        newDay + 1,
        WEATHER_FORECAST_DAYS,
        climate,
        hemisphere,
      );

      // Drama: pattern severity jump ≥2 vs prior day on a Group/Graded race day.
      if (lastState && lastState.day === newDay - 1) {
        const jump = PATTERN_SEVERITY[today.pattern] - PATTERN_SEVERITY[lastState.pattern];
        if (jump >= 2) {
          const dramaRace = state.races.find(
            (r) => !r.resolved && r.day === newDay && r.graded?.grade && raceTrackId(r) === trackId,
          );
          if (dramaRace) {
            const dramaText = `${today.pattern === "storm" ? "Storm" : "Heavy weather"} forecast at ${dramaRace.graded?.track ?? trackId} — track downgraded ahead of the ${dramaRace.name}.`;
            newLogs.push({
              day: newDay,
              text: dramaText,
            });

            // Push to Inbox
            newImpacts.push({
              id: generateUUID(),
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
    }

    // Track conditions progress race-by-race sequentially
    const trackCurrentCondition: Record<string, TrackCondition> = {};
    const updatedRaces: Race[] = [];

    for (const race of state.races) {
      if (race.resolved || race.day !== newDay) {
        updatedRaces.push(race);
        continue;
      }
      const tid = raceTrackId(race);
      if (!tid) {
        updatedRaces.push(race);
        continue;
      }
      const todays = newByTrack[tid]?.slice(-1)[0];
      if (!todays) {
        updatedRaces.push(race);
        continue;
      }

      if (trackCurrentCondition[tid] === undefined) {
        trackCurrentCondition[tid] = race.trackCondition ?? "good";
      }

      const currentCondition = trackCurrentCondition[tid];

      updatedRaces.push({
        ...race,
        trackCondition: currentCondition,
        weather: race.weather ?? toRaceWeather(todays.pattern),
      });

      const nextCondition = calculateConditionChange(
        currentCondition,
        toTrackWeatherPattern(todays.pattern),
        1,
        0.5,
      );
      trackCurrentCondition[tid] = nextCondition;
    }

    return {
      ...context,
      state: {
        ...state,
        races: updatedRaces,
        // Cast: weather field is appended via slice; SystemsState declares it optional.
        ...({
          weather: { byTrack: newByTrack, forecast: newForecast },
        } as any),
        log: newLogs.length ? [...newLogs, ...state.log].slice(0, 200) : state.log,
      },
      impacts: [...context.impacts, ...newImpacts],
    };
  },
};
