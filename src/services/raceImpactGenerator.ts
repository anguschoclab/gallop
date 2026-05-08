import type {
  AnyImpact,
  RaceResultImpact,
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
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { generateUUID } from "@/game/uuid";
import { formatCurrency } from "@/components/HorseBits";
import { beyerFigure } from "@/game/beyer";
import { calculateClassBonus } from "@/core/common/classBonus";
import { recalcStandingFee } from "@/core/breeding/stallions";
import {
  detectInbreedingPattern,
  inbreedingPerformanceDampener,
} from "@/core/breeding/populationGenetics";
import type { Race, Horse, Jockey } from "@/game/types";
import { getCurrentYear } from "@/game/raceSchedule";
import { PRIZE_SPLIT } from "@/game/constants/gameConstants";
import { GRADED_RACES } from "@/core/data/gradedRaces";
import { createReputationEvent, calculateRaceWinReputation } from "@/core/reputation";
import type { ManagerReputation } from "@/core/reputation";
import { createTransaction } from "@/core/transactions";
import type { Transaction } from "@/core/transactions";

export interface GenerateRaceImpactsProps {
  race: Race;
  result: Array<{ horseId: string; position: number; time: number }>;
  runners: Array<{ horseId: string; barrier?: number; lane?: number }>;
  horses: Horse[];
  jockeys: Jockey[];
  newDay: number;
  stateCash: number;
  stateReputation?: ManagerReputation;
}

export function generateRaceImpacts({
  race,
  result,
  runners,
  horses,
  jockeys,
  newDay,
  stateCash,
  stateReputation,
}: GenerateRaceImpactsProps): {
  impacts: AnyImpact[];
  transactions: Transaction[];
  reputationEvents: ReturnType<typeof createReputationEvent>[];
} {
  const impacts: AnyImpact[] = [];
  const newTransactions: Transaction[] = [];
  const newReputationEvents = stateReputation?.events ?? [];
  const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);

  // Generate race result impact
  impacts.push({
    id: generateUUID(),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "always",
    type: "race_result",
    raceId: race.id,
    results: result.map(({ horseId, position, time }) => ({ horseId, position, time })),
    reason: "Race resolved",
  } as RaceResultImpact);

  // Generate per-horse impacts
  for (const r of result) {
    const horse = horses.find((h) => h.id === r.horseId);
    if (!horse) continue;

    const runner = runners.find((run) => run.horseId === r.horseId);

    // Energy impact (-25)
    impacts.push({
      id: generateUUID(),
      intentId: "",
      day: newDay,
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
      day: newDay,
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
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "fame_change",
        horseId: horse.id,
        delta: fameDelta,
        reason: `Race position: ${r.position}`,
      } as FameImpact);
    }

    // Beyer calculation with inbreeding dampener
    const beyer = beyerFigure({ distance: race.distance, finishTime: r.time, classBonus });
    const inbreedingPattern = detectInbreedingPattern(horse.pedigree);
    const dampener = inbreedingPerformanceDampener(inbreedingPattern);
    const adjustedBeyer = Math.max(0, beyer - dampener);

    // Win and You're In qualification
    let winAndYouInQualified = undefined;
    if (r.position === 1 && race.graded?.winAndYouInTarget) {
      const currentYear = getCurrentYear(newDay);
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
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "race_history",
      horseId: horse.id,
      raceHistoryEntry: {
        raceId: race.id,
        raceName: race.name,
        position: r.position,
        day: newDay,
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
      const currentYear = getCurrentYear(newDay);
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
            day: newDay,
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
        day: newDay,
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
            day: newDay,
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
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "cash_change",
            entityId: "",
            amount: prize,
            reason: `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
          } as CashImpact);

          // Record transaction for prize money income
          newTransactions.push(
            createTransaction(
              "income",
              "prize_money",
              prize,
              `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
              newDay,
              stateCash + prize,
              { horseId: horse.id, raceId: race.id },
            ),
          );

          // Track reputation for wins
          if (r.position === 1) {
            const repGain = calculateRaceWinReputation(race.graded?.grade, race.purse);
            newReputationEvents.push(
              createReputationEvent(
                "race_win",
                repGain,
                `Win in ${race.name}${race.graded ? ` (${race.graded.grade})` : ""}`,
                newDay,
                { horseId: horse.id, raceId: race.id },
              ),
            );
          }
        }
      }
    }

    // Jockey riding fee deduction
    const entry = race.entries.find((e) => e.horseId === horse.id);
    if (entry?.jockeyId) {
      const jockey = jockeys?.find((j) => j.id === entry.jockeyId);
      if (jockey) {
        const ridingFee = jockey.ridingFee || 100;
        if (horse.stableId) {
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "cash_change",
            entityId: horse.stableId,
            amount: -ridingFee,
            reason: `Jockey fee: ${jockey.name}`,
          } as CashImpact);
        } else {
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "cash_change",
            entityId: "",
            amount: -ridingFee,
            reason: `Jockey fee: ${jockey.name}`,
          } as CashImpact);

          newTransactions.push(
            createTransaction(
              "expense",
              "jockey_fee",
              -ridingFee,
              `Jockey fee: ${jockey.name} for ${horse.name}`,
              newDay,
              stateCash - ridingFee,
              { horseId: horse.id, raceId: race.id },
            ),
          );
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
          day: newDay,
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
              { horses, npcStables: [] },
            )
          : sire.stud.standingFee;

        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
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
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "jockey_stats",
          jockeyId: jockey.id,
          careerStarts: jockey.careerStarts + 1,
          careerWins: jockey.careerWins + (r.position === 1 ? 1 : 0),
          fame: Math.min(100, jockey.fame + (r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0)),
          reason: `Rode ${horse.name} to ${r.position}${getOrdinalSuffix(r.position)}`,
        } as JockeyStatsImpact);

        if (jockeyFee > 0) {
          if (raceEntry.owned) {
            impacts.push({
              id: generateUUID(),
              intentId: "",
              day: newDay,
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
              day: newDay,
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
      day: newDay,
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
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "log",
      text: `${race.name} — ${summary}${prize > 0 ? ` (won ${formatCurrency(prize)})` : ""}`,
      reason: "Race summary",
    } as LogImpact);
  }

  return { impacts, transactions: newTransactions, reputationEvents: newReputationEvents };
}
