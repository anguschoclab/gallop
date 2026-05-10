import type { RaceSnapshot } from "@/core/race/types";
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
  ReputationImpact,
  TransactionImpact,
  InjuryImpact,
  NewsImpact,
  RecoveryImpact,
  BeyerImpact,
} from "@/core/resolver/impacts/index";
import { generateRaceNews } from "@/services/newsGenerator";
import { rollForInjury } from "@/core/health/healthSystem";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { Rng } from "@/game/rng";
import { getOrdinalSuffix } from "@/core/common/ordinal";
import { generateUUID } from "@/game/uuid";
import { formatCurrency } from "@/lib/formatting";
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
import { getPeakingBeyerMultiplier } from "@/core/health/banister";
import { AFFINITY_CONSTANTS } from "@/core/jockey/affinity";

/**
 * Props for the generateRaceImpacts function.
 */
export interface GenerateRaceImpactsProps {
  /** The completed race data */
  race: Race;
  /** Final race result positions and times for each participant */
  result: Array<{ horseId: string; position: number; time: number }>;
  /** The field of runners with lane and barrier data */
  runners: Array<{ horseId: string; barrier?: number; lane?: number }>;
  /** Current horse population (can be an array or a pre-indexed Map) */
  horses: Horse[] | Map<string, Horse>;
  /** Current jockey population (can be an array or a pre-indexed Map) */
  jockeys: Jockey[] | Map<string, Jockey>;
  /** Game day of the race resolution */
  newDay: number;
  /** Current player cash balance */
  stateCash: number;
  /** Current manager reputation state */
  stateReputation?: ManagerReputation;
  /** Active staff members with potential bonuses */
  hiredStaff?: StaffMember[];
  /** Optional random number generator for stochastic events (e.g., injuries) */
  rng?: Rng;
  /** Optional detailed race snapshots for replay/summary purposes */
  snapshots?: RaceSnapshot[];
  /** Speed pars for Beyer speed figure calculation, indexed by distance */
  calibratedPars: Record<number, number>;
}

/**
 * Generate all state impacts resulting from a completed race.
 *
 * This function orchestrates the post-race resolution logic, including:
 * - Result recording and history updates
 * - Energy expenditure and injury rolls
 * - Performance metrics (Beyer Figures) with genetic dampeners
 * - Financial transactions (prize money, jockey fees)
 * - Reputation and fame updates
 * - Career milestones (Triple Crown progress, blue hen status, stud fees)
 * - Narrative and news generation
 *
 * @param props - Impact generation properties
 * @returns Array of impacts to be applied to the game state by the resolver
 */
export function generateRaceImpacts({
  race,
  result,
  runners,
  horses,
  jockeys,
  newDay,
  stateCash,
  stateReputation,
  hiredStaff = [],
  rng,
  snapshots = [],
  calibratedPars,
}: GenerateRaceImpactsProps): AnyImpact[] {
  const impacts: AnyImpact[] = [];
  const classBonus = calculateClassBonus(race.graded?.grade, race.raceClass);
  
  // Normalize collections to Maps for O(1) lookups
  const horseMap = horses instanceof Map ? (horses as Map<string, Horse>) : new Map(horses.map(h => [h.id, h]));
  const jockeyMap = jockeys instanceof Map ? (jockeys as Map<string, Jockey>) : new Map(jockeys.map(j => [j.id, j]));
  
  const runnersMap = new Map(runners.map(run => [run.horseId, run]));
  const entriesMap = new Map(race.entries.map(e => [e.horseId, e]));

  // 1. Record the overall race result
  impacts.push({
    id: generateUUID(),
    intentId: "",
    day: newDay,
    phase: "raceResolution",
    logLevel: "always",
    type: "race_result",
    raceId: race.id,
    results: result.map(({ horseId, position, time }) => ({ horseId, position, time })),
    snapshots,
    reason: "Race resolved",
  } as RaceResultImpact);

  // 2. Process per-horse consequences
  for (const r of result) {
    const horse = horseMap.get(r.horseId);
    if (!horse) continue;

    const runner = runnersMap.get(r.horseId);

    // Energy expenditure: Constant drain per race
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

    // Health: Roll for potential injuries based on current condition and staff bonuses
    if (rng) {
      const injury = rollForInjury(rng, horse, newDay, hiredStaff);
      if (injury) {
        impacts.push(injury);
      }
    }

    // Form: Morale/Form changes based on finish position
    const stableId = horse.stableId || "";
    const groom = hiredStaff.find(s => s.role === 'groom' && s.stableId === stableId);

    const baseFormDelta =
      r.position === 1 ? 3 : r.position === 2 ? 2 : r.position === 3 ? 1 : r.position <= 5 ? 0 : -1;
    // Grooms prevent negative form delta from poor performance
    const formDelta = baseFormDelta < 0 && groom ? 0 : baseFormDelta;

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

    // Fame: Increases for top 3 finishers
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

    // Performance: Beyer calculation with inbreeding-based performance dampeners and peaking multiplier
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

    // Fatigue: Recovery points drain based on race distance and performance intensity (Beyer)
    const recoveryDrain = Math.min(30, Math.floor(race.distance / 100) + Math.floor(adjustedBeyer / 20));
    impacts.push({
      id: generateUUID(),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "recovery_change",
      horseId: horse.id,
      delta: -recoveryDrain,
      reason: "Race fatigue",
    } as RecoveryImpact);

    // Update Beyer history for future valuations and AI logic
    impacts.push({
      id: generateUUID(),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "conditional",
      type: "beyer_update",
      horseId: horse.id,
      beyer: adjustedBeyer,
      raceDay: newDay,
      reason: "Race performance",
    } as BeyerImpact);

    // Eligibility: Check for "Win and You're In" qualifications for year-end championships
    let winAndYouInQualified = undefined;
    if (r.position === 1 && race.graded?.winAndYouInTarget) {
      const currentYear = getCurrentYear(newDay);
      winAndYouInQualified = {
        year: currentYear,
        raceId: race.id,
        raceKey: race.graded.winAndYouInTarget,
      };
    }

    // History: Record permanent entry in the horse's race career log
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

    // Milestones: Progress tracking for Triple Crown series
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

    // 3. Financials: Prize money distribution
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

          // Record ledger transaction for player income
          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "transaction",
            amount: prize,
            category: "prize_money",
            description: `Prize money: ${r.position}${getOrdinalSuffix(r.position)} in ${race.name}`,
            metadata: { horseId: horse.id, raceId: race.id },
          } as TransactionImpact);

          // Reputation: Manager reputation increases for wins
          if (r.position === 1) {
            const repGain = calculateRaceWinReputation(race.graded?.grade, race.purse);
            impacts.push({
              id: generateUUID(),
              intentId: "",
              day: newDay,
              phase: "raceResolution",
              logLevel: "always",
              type: "reputation_change",
              delta: repGain,
              source: "race_win",
              reason: `Win in ${race.name}${race.graded ? ` (${race.graded.grade})` : ""}`,
              metadata: { horseId: horse.id, raceId: race.id },
            } as ReputationImpact);
          }
        }
      }
    }

    // 4. Financials: Jockey riding fees
    const entry = entriesMap.get(horse.id);
    if (entry?.jockeyId) {
      const jockey = jockeyMap.get(entry.jockeyId);

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

          impacts.push({
            id: generateUUID(),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "transaction",
            amount: -ridingFee,
            category: "jockey_fee",
            description: `Jockey fee: ${jockey.name} for ${horse.name}`,
            metadata: { horseId: horse.id, raceId: race.id },
          } as TransactionImpact);
        }

        // --- AFFINITY XP GAIN ---
        const xpGain = AFFINITY_CONSTANTS.XP_PER_RACE + (r.position === 1 ? AFFINITY_CONSTANTS.XP_PER_WIN_BONUS : 0);
        impacts.push({
          id: generateUUID(),
          intentId: "",
          day: newDay,
          phase: "raceResolution",
          logLevel: "conditional",
          type: "jockey_affinity_gain",
          jockeyId: jockey.id,
          horseId: horse.id,
          xp: xpGain,
          reason: `Raced ${horse.name} to ${r.position}${getOrdinalSuffix(r.position)}`,
        } as any);
        // --- END AFFINITY XP GAIN ---
      }
    }

    // 5. Breeding: "Blue Hen" status tracking for high-performing mares
    if (
      r.position === 1 &&
      (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")
    ) {
      const dam = horse.pedigree?.damId ? horseMap.get(horse.pedigree.damId) : undefined;

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

      // 6. Breeding: Stallion stud career and fee recalibration
      const sire = horse.pedigree?.sireId ? horseMap.get(horse.pedigree.sireId) : undefined;

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
              { horses: Array.from(horseMap.values()), npcStables: [] },
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

    // 7. Jockey performance and stats tracking
    const raceEntry = entriesMap.get(horse.id);
    if (raceEntry?.jockeyId && r.position - 1 < PRIZE_SPLIT.length) {
      const jockey = jockeyMap.get(raceEntry.jockeyId);

      if (jockey) {
        const winAmount = PRIZE_SPLIT[r.position - 1] * race.purse;
        const jockeyFee = Math.round(winAmount * 0.1); // Jockeys take 10% of purse earnings

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

  // 8. Analytics: Global pace samples for handicapping logic
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

  // 9. Narrative: Generate race summary logs for the player
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
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "log",
      text: `${race.name} — ${summary}${prize > 0 ? ` (won ${formatCurrency(prize)})` : ""}`,
      reason: "Race summary",
    } as LogImpact);
  }

  // 10. Narrative: Dynamic news generation for major races
  const newsItem = generateRaceNews(race, result, Array.from(horseMap.values()), newDay);
  if (newsItem) {
    impacts.push({
      id: generateUUID(),
      intentId: "",
      day: newDay,
      phase: "raceResolution",
      logLevel: "always",
      type: "news_item",
      newsItem,
    } as NewsImpact);
  }

  return impacts;
}
