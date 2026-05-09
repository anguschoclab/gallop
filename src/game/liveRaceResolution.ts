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
} from "@/core/resolver/impacts";
import type { Race, Horse, Jockey } from "./types";
import type { Runner } from "@/core/race/raceSim";
import { calculateClassBonus } from "@/core/common/classBonus";
import { beyerFigure } from "./beyer";
import { formatCurrency } from "@/lib/formatting";
import {
  detectInbreedingPattern,
  inbreedingPerformanceDampener,
} from "@/core/breeding/populationGenetics";
import { recalcStandingFee } from "@/core/breeding/stallions";
import { getCurrentYear } from "./raceSchedule";
import { GRADED_RACES } from "@/core/data/gradedRaces";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { generateUUID } from "@/game/uuid";
import { applyImpacts, type ResolverContext } from "@/core/resolver/resolver";
import { PRIZE_SPLIT } from "./constants/gameConstants";

/**
 * Resolves a race and applies impacts for live race simulation.
 * This is used when the player watches a race live, as opposed to the pipeline-based
 * resolution which runs during day-rollover.
 */
export function resolveLiveRaceWithImpacts(
  race: Race,
  result: { horseId: string; position: number; time: number }[],
  runners: Runner[],
  horses: Horse[],
  jockeys: Jockey[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  npcStables: any[],
  day: number,
  calibratedPars: Record<number, number> = {},
): ResolverContext {
  if (race.resolved) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state: { horses, jockeys, npcStables, races: [race] } as any,
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

  // Generate per-horse impacts
  for (const r of result) {
    const horse = horses.find((h) => h.id === r.horseId);
    if (!horse) continue;

    const runner = runners.find((run) => run.horseId === r.horseId);

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

    // Beyer calculation with inbreeding dampener
    const beyer = beyerFigure({
      distance: race.distance,
      finishTime: r.time,
      classBonus,
      calibratedPars,
    });
    const inbreedingPattern = detectInbreedingPattern(horse.pedigree);
    const dampener = inbreedingPerformanceDampener(inbreedingPattern);
    const adjustedBeyer = Math.max(0, beyer - dampener);

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
        const historyEntry = horse.raceHistory.find(
          (rh) => rh.raceId === tcRace.key || rh.raceName === tcRace.name,
        );
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
      const dam = horses.find((h) => h.id === horse.pedigree?.damId);
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
      const sire = horses.find((h) => h.id === horse.pedigree?.sireId);
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { horses, npcStables } as any,
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
    const raceEntry = race.entries.find((e) => e.horseId === horse.id);
    if (raceEntry?.jockeyId && r.position - 1 < PRIZE_SPLIT.length) {
      const jockey = jockeys?.find((j) => j.id === raceEntry.jockeyId);
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
    const horse = horses.find((h) => h.id === r.horseId);
    return horse && !horse.stableId;
  });
  if (ownedHorses.length > 0) {
    const summary = ownedHorses
      .map((r) => {
        const horse = horses.find((h) => h.id === r.horseId);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state: { horses, jockeys, npcStables, races: [race] } as any,
    intents: [],
    impacts,
    impactLog: [],
    day,
  };
  const newState = applyImpacts(resolverContext);

  return newState;
}
