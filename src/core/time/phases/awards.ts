/**
 * phases/awards.ts - Awards ceremony phase
 *
 * This file provides the awards ceremony phase that calculates and presents
 * regional awards at year end.
 *
 * Dependencies: ../pipeline (PipelineContext), @/game/awards/scoring (determineAllRegionalWinners, determineRegionalWinners), @/core/calendar/dateFormatting (dayOfYear), @/game/uuid (generateUUID), @/game/awards/types (AwardRegion, RegionalAward, AWARD_CEREMONY_SCHEDULE)
 * Related files: ../pipeline.ts (uses phase)
 */

/**
 * Phase: Awards Ceremony
 * Calculate and present regional awards at year end
 */

import type { PipelineContext } from "../pipeline";
import { determineRegionalWinners } from "@/core/awards/scoring";
import { dayOfYear } from "@/core/calendar/dateFormatting";
import { generateUUID } from "@/core/uuid";
import type { AwardRegion, RegionalAward } from "@/core/awards/types";
import { AWARD_CEREMONY_SCHEDULE } from "@/core/awards/types";
import { PHASE_ORDER_AWARDS, FANS_PER_FAME_POINT, DAYS_PER_YEAR } from "@/constants";
import type { AnyImpact } from "@/core/resolver/impacts/index";
import type { FameImpact, FanCountImpact, InboxImpact } from "@/core/resolver/impacts/index";
import { generateAwardInboxMessage } from "@/core/awards/awardInboxMessages";

/** Fame boost for Horse of the Year award winners */
const HOTY_FAME_BOOST = 25;
/** Fame boost for category award winners (non-HOTY) */
const CATEGORY_FAME_BOOST = 15;

export const awardsPhase = {
  name: "awards",
  order: PHASE_ORDER_AWARDS, // Run before state update phase
  execute: (context: PipelineContext): PipelineContext => {
    const { state, newDay, logs } = context;
    const doy = dayOfYear(newDay);
    const year = Math.floor((newDay - 1) / DAYS_PER_YEAR) + 1;

    // Check for any ceremony scheduled for today
    const todayCeremonies = AWARD_CEREMONY_SCHEDULE.filter((c) => c.dayOfYear === doy);
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
    const awardLogs: { day: number; text: string }[] = [];
    const updatedLastAwardYear = { ...lastAwardYear };
    const impacts: AnyImpact[] = [];

    const { horseMap, raceMap } = context;

    for (const ceremony of todayCeremonies) {
      const region = ceremony.region;

      // Skip if already processed this year for this region
      if (lastAwardYear[region] >= year) {
        continue;
      }

      // Determine winners for this region
      const winners = determineRegionalWinners(Object.values(state.horses), year, region, raceMap);

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

      // Award bonuses to winning horses — emit fame_change impacts only
      for (const award of regionAwards) {
        const horse = horseMap.get(award.horseId);
        if (horse) {
          // Fame boost: +25 for HOTY, +15 for category
          const fameBoost =
            award.category === "horse_of_the_year" ? HOTY_FAME_BOOST : CATEGORY_FAME_BOOST;
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "awards",
            logLevel: "conditional",
            type: "fame_change",
            horseId: award.horseId,
            delta: fameBoost,
            reason: `${award.region} ${award.category} award fame bonus`,
          } as FameImpact);

          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "awards",
            logLevel: "conditional",
            type: "fan_count_change",
            horseId: award.horseId,
            delta: Math.round(fameBoost * FANS_PER_FAME_POINT),
            reason: `${award.region} ${award.category} award fan bonus`,
          } as FanCountImpact);
        }

        // Generate inbox message with CTA deep-link to award category page
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "awards",
          logLevel: "always",
          type: "inbox_message",
          message: generateAwardInboxMessage(award, newDay),
        } as InboxImpact);
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
        awards: [...(state.awards || []), ...newAwards],
        lastAwardYear: updatedLastAwardYear,
        pendingAwardCeremonies: [...(state.pendingAwardCeremonies || []), ...newCeremonies],
      },
      logs: [...logs, ...awardLogs],
      impacts: [...context.impacts, ...impacts],
    };
  },
};
