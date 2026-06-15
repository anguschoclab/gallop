/**
 * liveRaceResolution.ts - Live race resolution with impacts
 *
 * This file resolves races and applies impacts for live race simulation, used when
 * the player watches a race live as opposed to the pipeline-based resolution during
 * day-rollover.
 *
 * Dependencies: @/core/resolver/impacts/index (AnyImpact, EnergyImpact, FormImpact, FameImpact, RaceHistoryImpact, CashImpact, BlueHenImpact, StudCareerImpact, PaceSampleImpact, JockeyStatsImpact, LogImpact, TripleCrownProgressImpact), ./types (Race, Horse, Jockey), @/core/race/raceSim (Runner), @/core/common/classBonus (calculateClassBonus), ./beyer (beyerFigure), @/lib/formatting (formatCurrency), @/core/breeding/populationGenetics (detectInbreedingPattern, inbreedingPerformanceDampener), @/core/breeding/stallions (recalcStandingFee), ./raceSchedule (getCurrentYear), @/core/data/gradedRaces (GRADED_RACES), @/core/common/ordinal (getOrdinalSuffix), ./uuid (generateUUID), @/core/resolver/resolver (applyImpacts, ResolverContext), ./constants/gameConstants (PRIZE_SPLIT)
 * Related files: raceSim.ts (provides race results), resolver.ts (applies impacts)
 */

import type {
  AnyImpact,
  EnergyImpact,
  FormImpact,
  FameImpact,
  RaceHistoryImpact,
  CashImpact,
  BlueHenImpact,
  StudCareerImpact,
  PaceSampleImpact,
  JockeyStatsImpact,
  LogImpact,
  TripleCrownProgressImpact,
} from "@/core/resolver/impacts/index";
import { computeSectionalSplits } from "@/core/race/sectionalAnalysis";
import type { Race } from "./types";
import type { Horse } from "@/core/horse/types";
import type { Jockey } from "@/game/types";
import type { Stable } from "@/core/stable/types";
import type { GameState } from "@/game/types";
import type { Runner } from "@/core/race/engine/runnerBuilder";
import { calculateClassBonus } from "@/core/common/classBonus";
import { beyerFigure } from "./beyer";
import { formatCurrency } from "@/core/common/formatting";
import {
  detectInbreedingPattern,
  inbreedingPerformanceDampener,
} from "@/core/breeding/populationGenetics";
import { recalcStandingFee } from "@/core/breeding/stallions";
import { getCurrentYear } from "@/core/race/schedule";
import { GRADED_RACES } from "@/data/gradedRaces";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { generateUUID } from "@/core/uuid";
import { applyImpacts, type ResolverContext } from "@/core/resolver/resolver";
import { PRIZE_SPLIT } from "@/constants/gameConstants";
import { getPeakingBeyerMultiplier } from "@/core/health/banister";

/**
 * Resolves a race and applies impacts for live race simulation.
 *
 * This is used when the player watches a race live, as opposed to the pipeline-based
 * resolution which runs during day-rollover. Applies energy, form, fame, race history,
 * prize money, blue hen, stud career, jockey stats, pace sample, and log impacts.
 *
 * @param race - Race to resolve
 * @param result - Race results with horse IDs, positions, and times
 * @param runners - Runner objects from race simulation
 * @param horses - Array of all horses
 * @param jockeys - Array of all jockeys
 * @param npcStables - Array of NPC stables
 * @param day - Current simulation day
 * @param calibratedPars - Optional calibrated par times by distance bucket
 * @returns Resolver context with updated state and applied impacts
 */
export function resolveLiveRaceWithImpacts(
  race: Race,
  result: { horseId: string; position: number; time: number }[],
  runners: Runner[],
  horses: Horse[],
  jockeys: Jockey[],
  npcStables: Stable[],
  day: number,
  calibratedPars: Record<number, number> = {},
): ResolverContext {
  if (race.resolved) {
    return {
      state: { horses, jockeys, npcStables, races: [race] } as GameState,
      intents: [],
      impacts: [],
      impactLog: [],
      day,
    };
  }

  const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);
  const impacts: AnyImpact[] = [];

  // Mark race as resolved
  race.resolved = true;
  race.result = result.map(({ horseId, position, time }) => ({ horseId, position, time }));

  // Compute sectional splits if snapshots are available
  if (race.snapshots && race.snapshots.length > 0) {
    race.sectionalSplits = computeSectionalSplits(race.snapshots, race.distance);
  }

  // Pre-build lookup maps for O(1) access
  const horseMap = new Map(horses.map((h) => [h.id, h]));
  const runnerMap = new Map(runners.map((run) => [run.horseId, run]));
  const jockeyMap = new Map((jockeys || []).map((j) => [j.id, j]));
  const raceEntryMap = new Map(race.entries.map((e) => [e.horseId, e]));
  const splitEntryMaps =
    race.sectionalSplits?.map((split) => new Map(split.entries.map((e) => [e.horseId, e]))) ?? [];

  // Generate per-horse impacts
  for (const r of result) {
    const horse = horseMap.get(r.horseId);
    if (!horse) continue;

    const runner = runnerMap.get(r.horseId);

    // Energy impact (-25)
    impacts.push({
      id: generateUUID(),
      intentId: "",
      day,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "energy_change",
      horseId: horse.id,
      delta: -25,
      reason: "Race energy expenditure",
    } as EnergyImpact);

    // Form impact based on position
    const formDelta =
      r.position === 1 ? 3 : r.position === 2 ? 2 : r.position === 3 ? 1 : r.position <= 5 ? 0 : -1;
    impacts.push({
      id: generateUUID(),
      intentId: "",
      day,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "form_change",
      horseId: horse.id,
      delta: formDelta,
      reason: `Race position: ${r.position}`,
    } as FormImpact);

    // Fame impact based on position
    const fameDelta = r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0;
    if (fameDelta > 0) {
      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "fame_change",
        horseId: horse.id,
        delta: fameDelta,
        reason: `Race position: ${r.position}`,
      } as FameImpact);
    }

    // Beyer calculation with inbreeding dampener and peaking multiplier
    const beyer = beyerFigure({
      distance: race.distance,
      finishTime: r.time,
      classBonus,
      calibratedPars,
    });

    const inbreedingPattern = detectInbreedingPattern(horse.pedigree);
    const dampener = inbreedingPerformanceDampener(inbreedingPattern);
    const peakingMultiplier = getPeakingBeyerMultiplier(horse.peakingIndex ?? 0);
    const adjustedBeyer = Math.max(0, Math.round((beyer - dampener) * peakingMultiplier));

    // Win and You're In qualification
    let winAndYouInQualified = undefined;
    if (r.position === 1 && race.graded?.winAndYouInTarget) {
      const currentYear = getCurrentYear(day);
      winAndYouInQualified = {
        year: currentYear,
        raceId: race.id,
        raceKey: race.graded.winAndYouInTarget,
      };
    }

    // Race history impact
    const trackId = race.trackId || race.graded?.trackId;
    const pacePositions = race.sectionalSplits?.map((split, i) => {
      const entry = splitEntryMaps[i]?.get(horse.id);
      return entry?.rank ?? 0;
    });
    // Store visits BEFORE this race; handler increments by 1 when applying
    const courseVisitCount = trackId ? (horse.courseVisits?.[trackId] ?? 0) : undefined;

    impacts.push({
      id: generateUUID(),
      intentId: "",
      day,
      phase: "raceResolution",
      logLevel: "always",
      type: "race_history",
      horseId: horse.id,
      raceHistoryEntry: {
        raceId: race.id,
        raceName: race.name,
        position: r.position,
        day,
        beyer: adjustedBeyer,
        grade: race.graded?.grade,
        distance: race.distance,
        surface: race.graded?.surface,
        purse: race.purse,
        fieldSize: result.length,
        raceClass: race.raceClass,
        barrier: runner?.barrier,
        lane: runner?.lane,
        winAndYouInQualified,
        pacePositions,
        courseVisitCount,
      },
      reason: "Race completed",
    } as RaceHistoryImpact);

    // Triple Crown progress tracking
    if (r.position === 1 && race.graded?.triplecrownKey) {
      const currentYear = getCurrentYear(day);
      const triplecrownKey = race.graded.triplecrownKey;

      // Get all races for this triple crown series
      const tcRaces = GRADED_RACES.filter((g) => g.triplecrownKey === triplecrownKey);

      // Check horse's race history for all legs
      const raceHistoryMap = new Map(
        (
          horse.raceHistory as Array<{
            raceId: string;
            raceName: string;
            position: number;
            day: number;
          }>
        ).map((rh) => [rh.raceId, rh]),
      );
      const legs = tcRaces.map((tcRace) => {
        // If this is the current race being resolved, use the current result
        if (tcRace.key === race.graded?.key) {
          return {
            raceKey: tcRace.key,
            position: r.position,
            day,
          };
        }
        // Otherwise check race history
        const historyEntry =
          raceHistoryMap.get(tcRace.key) ||
          (
            horse.raceHistory as Array<{
              raceId: string;
              raceName: string;
              position: number;
              day: number;
            }>
          ).find((rh) => rh.raceName === tcRace.name);
        return {
          raceKey: tcRace.key,
          position: historyEntry?.position ?? 999,
          day: historyEntry?.day ?? 0,
        };
      });

      // Check if won all legs (all positions === 1)
      const won = legs.every((leg) => leg.position === 1);

      impacts.push({
        id: generateUUID(),
        intentId: "",
        day,
        phase: "raceResolution",
        logLevel: "always",
        type: "triple_crown_progress",
        horseId: horse.id,
        triplecrownKey,
        year: currentYear,
        legs,
        won,
        reason: won
          ? `Triple Crown winner! ${horse.name} won ${triplecrownKey}`
          : `Triple Crown progress updated for ${horse.name}`,
      } as TripleCrownProgressImpact);
    }

    // Prize money impact
    if (r.position - 1 < PRIZE_SPLIT.length) {
      const prize = Math.round(race.purse * PRIZE_SPLIT[r.position - 1]);
      if (prize > 0) {
        if (horse.stableId) {
          // NPC stable gets prize money
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "cash_change",
            entityId: horse.stableId,
            amount: prize,
            reason: `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
          } as CashImpact);
        } else {
          // Player gets prize money
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "cash_change",
            entityId: "",
            amount: prize,
            reason: `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
          } as CashImpact);
        }
      }
    }

    // Blue hen impact for graded stakes winners
    if (
      r.position === 1 &&
      (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")
    ) {
      const dam = horseMap.get(horse.pedigree?.damId || "");
      if (dam) {
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "blue hen_status",
          horseId: dam.id,
          blueHenStatus: {
            isBlueHen: dam.blueHenStatus?.isBlueHen || false,
            stakesWinnersProduced: (dam.blueHenStatus?.stakesWinnersProduced ?? 0) + 1,
            group1WinnersProduced:
              race.graded?.grade === "G1"
                ? (dam.blueHenStatus?.group1WinnersProduced ?? 0) + 1
                : dam.blueHenStatus?.group1WinnersProduced,
            blueHenScore: dam.blueHenStatus?.blueHenScore || 0,
            foalsProduced: dam.blueHenStatus?.foalsProduced || 0,
          },
          reason: `Stakes win by ${horse.name}`,
        } as BlueHenImpact);
      }

      // Stud career impact for sire
      const sire = horseMap.get(horse.pedigree?.sireId || "");
      if (sire && sire.stud?.atStud) {
        const newStakesFoals = (sire.stud.lifetimeStakesFoals ?? 0) + 1;
        const newG1Foals =
          race.graded?.grade === "G1"
            ? (sire.stud.lifetimeG1Foals ?? 0) + 1
            : sire.stud.lifetimeG1Foals;

        // Only NPCs auto-adjust fees; players manage their own
        const previousFee = sire.stud.standingFee;
        const newFee = sire.stableId
          ? recalcStandingFee(
              {
                ...sire,
                stud: {
                  ...sire.stud,
                  lifetimeStakesFoals: newStakesFoals,
                  lifetimeG1Foals: newG1Foals,
                },
              },
              day,
            )
          : sire.stud.standingFee;

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "stud_career",
          horseId: sire.id,
          studCareer: {
            ...sire.stud,
            standingFee: newFee,
            previousStandingFee: previousFee,
            lifetimeStakesFoals: newStakesFoals,
            lifetimeG1Foals: newG1Foals,
          },
          reason: `Stakes win by ${horse.name}${sire.stableId ? `. Fee: $${formatCurrency(previousFee)} → $${formatCurrency(newFee)}.` : ""}`,
        } as StudCareerImpact);
      }
    }

    // Jockey stats impact
    const raceEntry = raceEntryMap.get(horse.id);
    if (raceEntry?.jockeyId && r.position - 1 < PRIZE_SPLIT.length) {
      const jockey = jockeyMap.get(raceEntry.jockeyId);
      if (jockey) {
        const winAmount = PRIZE_SPLIT[r.position - 1] * race.purse;
        const jockeyFee = Math.round(winAmount * 0.1);

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "jockey_stats",
          jockeyId: jockey.id,
          careerStarts: jockey.careerStarts + 1,
          careerWins: jockey.careerWins + (r.position === 1 ? 1 : 0),
          fame: Math.min(100, jockey.fame + (r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0)),
          reason: `Rode ${horse.name} to ${r.position}${getOrdinalSuffix(r.position)}`,
        } as JockeyStatsImpact);

        // Jockey fee impact
        if (jockeyFee > 0) {
          if (raceEntry.owned) {
            impacts.push({
              id: generateUUID(),
              intentId: "",
              day,
              phase: "raceResolution",
              logLevel: "conditional",
              type: "cash_change",
              entityId: "",
              amount: -jockeyFee,
              reason: `Jockey fee for ${jockey.name}`,
            } as CashImpact);
          } else if (raceEntry.stableId) {
            impacts.push({
              id: generateUUID(),
              intentId: "",
              day,
              phase: "raceResolution",
              logLevel: "conditional",
              type: "cash_change",
              entityId: raceEntry.stableId,
              amount: -jockeyFee,
              reason: `Jockey fee for ${jockey.name}`,
            } as CashImpact);
          }
        }
      }
    }
  }

  // Pace sample impact for winner
  if (result.length > 0) {
    const winner = result[0];
    impacts.push({
      id: generateUUID(),
      intentId: "",
      day,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "pace_sample",
      distance: race.distance,
      time: winner.time,
      reason: `Pace sample from ${race.name}`,
    } as PaceSampleImpact);
  }

  // Log impact for race summary
  const ownedHorses = result.filter((r) => {
    const horse = horseMap.get(r.horseId);
    return horse && !horse.stableId;
  });
  if (ownedHorses.length > 0) {
    const summary = ownedHorses
      .map((r) => {
        const horse = horseMap.get(r.horseId);
        return `${horse?.name} ${r.position}${getOrdinalSuffix(r.position)}`;
      })
      .join(", ");
    const prize = ownedHorses.reduce((sum, r) => {
      if (r.position - 1 < PRIZE_SPLIT.length) {
        return sum + Math.round(race.purse * PRIZE_SPLIT[r.position - 1]);
      }
      return sum;
    }, 0);
    impacts.push({
      id: generateUUID(),
      intentId: "",
      day,
      phase: "raceResolution",
      logLevel: "always",
      type: "log",
      text: `${race.name} — ${summary}${prize > 0 ? ` (won ${formatCurrency(prize)})` : ""}`,
      reason: "Race summary",
    } as LogImpact);
  }

  // Apply impacts to state
  const resolverContext: ResolverContext = {
    state: { horses, jockeys, npcStables, races: [race] } as GameState,
    intents: [],
    impacts,
    impactLog: [],
    day,
  };
  const newState = applyImpacts(resolverContext);

  return newState;
}
