import type { HorseRaceHistoryEntry } from "@/core/horse/types";
import type { Race, Horse } from "@/game/types";
import type { SeasonRecord, TrackRecord } from "@/core/history/historyTypes";
import type { RaceContext } from "./types";

/**
 * Build RaceContext from race, horse, and historical data.
 *
 * @param race - The current race
 * @param horses - All horses participating in the race
 * @param seasonRecords - Historical season records
 * @param trackRecords - Track records keyed by `${trackId}_${surface}_${distance}`
 * @param currentYear - The current year for defending champion check
 * @returns RaceContext with defending champion, track record, and per-horse data
 */
export function buildRaceContext(
  race: Race,
  horses: Horse[],
  seasonRecords: SeasonRecord[],
  trackRecords: Record<string, TrackRecord>,
  currentYear: number,
): RaceContext {
  const context: RaceContext = {
    previousFinishPositions: {},
    horseCourseVisits: {},
  };

  // Defending champion: scan seasonRecords for a previous year winner of this race
  const raceName = race.name;
  const raceKey = race.graded?.key;
  const prevWinner = seasonRecords
    .filter(
      (r) => r.year < currentYear && (r.raceName === raceName || (raceKey && r.raceId === raceKey)),
    )
    .sort((a, b) => b.year - a.year)[0];

  if (prevWinner) {
    const horse = horses.find((h) => h.id === prevWinner.winnerId);
    context.defendingChampion = {
      horseName: horse?.name || prevWinner.winnerName,
      year: prevWinner.year,
    };
  }

  // Track record lookup
  const trackId = race.graded?.trackId || race.trackId;
  const surface = race.graded?.surface || race.surface;
  if (trackId && surface) {
    const recordKey = `${trackId}_${surface}_${race.distance}`;
    const record = trackRecords[recordKey];
    if (record) {
      context.trackRecordTime = record.time;
      context.trackRecordHolder = record.horseName;
    }
  }

  // Per-horse data
  for (const horse of horses) {
    // Previous finish positions in this race (from raceHistory)
    const prevFinish = horse.raceHistory?.find(
      (entry: HorseRaceHistoryEntry) => entry.raceName === raceName || entry.raceId === race?.id,
    );
    if (prevFinish && prevFinish.position) {
      context.previousFinishPositions[horse.id] = prevFinish.position;
    }

    // Course visits
    if (horse.courseVisits && trackId) {
      const visits = horse.courseVisits[trackId] || 0;
      if (visits > 0) {
        context.horseCourseVisits[horse.id] = visits;
      }
    }
  }

  return context;
}
