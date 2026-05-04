/**
 * Phase: Awards Ceremony
 * Calculate and present regional awards at year end
 */

import type { PipelineContext } from "../pipeline";
import { determineAllRegionalWinners, determineRegionalWinners } from "@/game/awards/scoring";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { generateUUID } from "@/game/uuid";
import type { AwardRegion, RegionalAward } from "@/game/awards/types";
import { AWARD_CEREMONY_SCHEDULE } from "@/game/awards/types";

export const awardsPhase = {
  name: "awards",
  order: 95, // Run before state update phase
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, logs } = context;
    const doy = dayOfYear(newDay);
    const year = Math.floor((newDay - 1) / 365) + 1;

    // Check for any ceremony scheduled for today
    const todayCeremonies = AWARD_CEREMONY_SCHEDULE.filter(c => c.dayOfYear === doy);
    if (todayCeremonies.length === 0) {
      return context;
    }

    const lastAwardYear = state.lastAwardYear || {
      north_america: 0,
      europe: 0,
      asia_pacific: 0,
      south_america: 0,
    };

    const newCeremonies: { region: AwardRegion; year: number; awards: RegionalAward[] }[] = [];
    let newAwards: RegionalAward[] = [];
    let updatedHorses = [...state.horses];
    const awardLogs: { day: number; text: string }[] = [];
    const updatedLastAwardYear = { ...lastAwardYear };

    for (const ceremony of todayCeremonies) {
      const region = ceremony.region;

      // Skip if already processed this year for this region
      if (lastAwardYear[region] >= year) {
        continue;
      }

      // Determine winners for this region
      const winners = determineRegionalWinners(state.horses, state.races, year, region);

      if (winners.length === 0) {
        updatedLastAwardYear[region] = year;
        continue;
      }

      // Create award objects with IDs
      const regionAwards: RegionalAward[] = winners.map((w) => ({
        ...w,
        id: generateUUID(),
        ceremonyDay: newDay,
      }));

      newAwards = [...newAwards, ...regionAwards];

      // Add to ceremonies queue
      newCeremonies.push({
        region,
        year,
        awards: regionAwards,
      });

      // Build log messages for player wins
      const playerWins = regionAwards.filter((a) => !a.stableId);
      const regionNames: Record<AwardRegion, string> = {
        north_america: "North America",
        europe: "Europe",
        asia_pacific: "Asia-Pacific",
        south_america: "South America",
      };

      for (const award of playerWins) {
        awardLogs.push({
          day: newDay,
          text: `🏆 ${regionNames[award.region]} Award: ${award.horseName} wins ${award.category.replace(/_/g, " ")}!`,
        });
      }

      // Award bonuses to winning horses
      for (const award of regionAwards) {
        const horseIndex = updatedHorses.findIndex((h) => h.id === award.horseId);
        if (horseIndex !== -1) {
          const horse = updatedHorses[horseIndex];
          // Fame boost: +25 for HOTY, +15 for category
          const fameBoost = award.category === "horse_of_the_year" ? 25 : 15;
          updatedHorses[horseIndex] = {
            ...horse,
            fame: Math.min(100, horse.fame + fameBoost),
          };
        }
      }

      updatedLastAwardYear[region] = year;
    }

    if (newAwards.length === 0) {
      return {
        ...context,
        state: {
          ...state,
          lastAwardYear: updatedLastAwardYear,
        },
      };
    }

    return {
      ...context,
      state: {
        ...state,
        horses: updatedHorses,
        awards: [...(state.awards || []), ...newAwards],
        lastAwardYear: updatedLastAwardYear,
        pendingAwardCeremonies: [...(state.pendingAwardCeremonies || []), ...newCeremonies],
      },
      logs: [...logs, ...awardLogs],
    };
  },
};
