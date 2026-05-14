"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRaceImpacts = generateRaceImpacts;
var sectionalAnalysis_1 = require("@/core/race/sectionalAnalysis");
var newsGenerator_1 = require("@/services/newsGenerator");
var healthSystem_1 = require("@/core/health/healthSystem");
var ordinal_1 = require("@/core/common/ordinal");
var uuid_1 = require("@/core/uuid");
var formatting_1 = require("@/lib/formatting");
var beyer_1 = require("@/game/beyer");
var classBonus_1 = require("@/core/common/classBonus");
var stallions_1 = require("@/core/breeding/stallions");
var populationGenetics_1 = require("@/core/breeding/populationGenetics");
var raceSchedule_1 = require("@/game/raceSchedule");
var gameConstants_1 = require("@/game/constants/gameConstants");
var gradedRaces_1 = require("@/core/data/gradedRaces");
var reputation_1 = require("@/core/reputation");
var banister_1 = require("@/core/health/banister");
var affinity_1 = require("@/core/jockey/affinity");
/**
 * Get prize split percentages for a specific race.
 *
 * Returns different prize splits based on race type:
 * - Graded races: Higher percentage to winner (70% vs 60%)
 * - Regular races: Standard split (60%, 25%, 10%, 5%)
 *
 * @param race - The race to get prize split for
 * @returns Array of prize split percentages
 */
function getPrizeSplitForRace(race) {
    // Graded races have a different prize split (more to winner)
    if (race.graded) {
        return gameConstants_1.GRADED_PRIZE_SPLIT;
    }
    // Default prize split for regular races
    return gameConstants_1.PRIZE_SPLIT;
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
/**
 * Generate energy expenditure impact for a horse.
 * @param horseId
 * @param newDay
 * @returns The energy impact object.
 */
function generateEnergyImpact(horseId, newDay, rng) {
    return {
        id: (0, uuid_1.generateUUID)(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "energy_change",
        horseId: horseId,
        delta: gameConstants_1.RACE_ENERGY_IMPACT,
        reason: "Race energy expenditure",
    };
}
/**
 * Generate form change impact based on finish position.
 * @param horse
 * @param position
 * @param newDay
 * @param hiredStaff
 * @returns The form impact object.
 */
function generateFormImpact(horse, position, newDay, hiredStaff, rng) {
    var stableId = horse.stableId || "";
    var groom = hiredStaff.find(function (s) { return s.role === "groom" && s.stableId === stableId; });
    var baseFormDelta = position === 1 ? 3 : position === 2 ? 2 : position === 3 ? 1 : position <= 5 ? 0 : -1;
    // Grooms prevent negative form delta from poor performance
    var formDelta = baseFormDelta < 0 && groom ? 0 : baseFormDelta;
    return {
        id: (0, uuid_1.generateUUID)(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "form_change",
        horseId: horse.id,
        delta: formDelta,
        reason: "Race position: ".concat(position),
    };
}
/**
 * Generate fame change impact for top 3 finishers.
 * @param horse
 * @param position
 * @param newDay
 * @returns The fame impact object, or null if no fame change.
 */
function generateFameImpact(horse, position, newDay, rng) {
    var fameDelta = position === 1 ? 2 : position <= 3 ? 0.5 : 0;
    if (fameDelta > 0) {
        return {
            id: (0, uuid_1.generateUUID)(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "fame_change",
            horseId: horse.id,
            delta: fameDelta,
            reason: "Race position: ".concat(position),
        };
    }
    return null;
}
/**
 * Generate Beyer figure and recovery impacts.
 * @param horse
 * @param position
 * @param time
 * @param race
 * @param classBonus
 * @param calibratedPars
 * @param newDay
 * @returns Object containing the Beyer impact and recovery impact.
 */
function generateBeyerAndRecoveryImpacts(horse, position, time, race, classBonus, calibratedPars, newDay, rng) {
    var _a;
    var beyer = (0, beyer_1.beyerFigure)({
        distance: race.distance,
        finishTime: time,
        classBonus: classBonus,
        calibratedPars: calibratedPars,
    });
    var inbreedingPattern = (0, populationGenetics_1.detectInbreedingPattern)(horse.pedigree);
    var dampener = (0, populationGenetics_1.inbreedingPerformanceDampener)(inbreedingPattern);
    var peakingMultiplier = (0, banister_1.getPeakingBeyerMultiplier)((_a = horse.peakingIndex) !== null && _a !== void 0 ? _a : 0);
    var adjustedBeyer = Math.max(0, Math.round((beyer - dampener) * peakingMultiplier));
    // Fatigue: Recovery points drain based on race distance and performance intensity (Beyer)
    var recoveryDrain = Math.min(gameConstants_1.STAMINA_DRAIN_MAX, Math.floor(race.distance / gameConstants_1.STAMINA_DRAIN_DISTANCE_DIVISOR) +
        Math.floor(adjustedBeyer / gameConstants_1.STAMINA_DRAIN_BEYER_DIVISOR));
    return {
        beyerImpact: {
            id: (0, uuid_1.generateUUID)(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "beyer_update",
            horseId: horse.id,
            beyer: adjustedBeyer,
            raceDay: newDay,
            reason: "Race performance",
        },
        recoveryImpact: {
            id: (0, uuid_1.generateUUID)(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "recovery_change",
            horseId: horse.id,
            delta: -recoveryDrain,
            reason: "Race fatigue",
        },
    };
}
/**
 * Generate race history impact.
 * @param horse
 * @param position
 * @param time
 * @param race
 * @param adjustedBeyer
 * @param newDay
 * @param runner
 * @param runner.horseId
 * @param runner.barrier
 * @param runner.lane
 * @returns The race history impact object.
 */
function generateRaceHistoryImpact(horse, position, time, race, adjustedBeyer, newDay, runner, rng) {
    var _a, _b, _c;
    // Eligibility: Check for "Win and You're In" qualifications for year-end championships
    var winAndYouInQualified = undefined;
    if (position === 1 && ((_a = race.graded) === null || _a === void 0 ? void 0 : _a.winAndYouInTarget)) {
        var currentYear = (0, raceSchedule_1.getCurrentYear)(newDay);
        winAndYouInQualified = {
            year: currentYear,
            raceId: race.id,
            raceKey: race.graded.winAndYouInTarget,
        };
    }
    return {
        id: (0, uuid_1.generateUUID)(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "always",
        type: "race_history",
        horseId: horse.id,
        raceHistoryEntry: {
            raceId: race.id,
            raceName: race.name,
            position: position,
            day: newDay,
            beyer: adjustedBeyer,
            grade: (_b = race.graded) === null || _b === void 0 ? void 0 : _b.grade,
            distance: race.distance,
            surface: (_c = race.graded) === null || _c === void 0 ? void 0 : _c.surface,
            purse: race.purse,
            fieldSize: 0, // Will be set by caller
            raceClass: race.raceClass,
            barrier: runner === null || runner === void 0 ? void 0 : runner.barrier,
            lane: runner === null || runner === void 0 ? void 0 : runner.lane,
            winAndYouInQualified: winAndYouInQualified,
        },
        reason: "Race completed",
    };
}
/**
 * Generate Triple Crown progress impact for winners of TC races.
 * @param horse
 * @param position
 * @param race
 * @param newDay
 * @returns The Triple Crown progress impact object, or null if not applicable.
 */
function generateTripleCrownProgressImpact(horse, position, race, newDay, rng) {
    var _a;
    if (position === 1 && ((_a = race.graded) === null || _a === void 0 ? void 0 : _a.triplecrownKey)) {
        var currentYear = (0, raceSchedule_1.getCurrentYear)(newDay);
        var triplecrownKey_1 = race.graded.triplecrownKey;
        // Get all races for this triple crown series
        var tcRaces = gradedRaces_1.GRADED_RACES.filter(function (g) { return g.triplecrownKey === triplecrownKey_1; });
        // Check horse's race history for all legs
        var legs = tcRaces.map(function (tcRace) {
            var _a, _b, _c;
            // If this is the current race being resolved, use the current result
            if (tcRace.key === ((_a = race.graded) === null || _a === void 0 ? void 0 : _a.key)) {
                return {
                    raceKey: tcRace.key,
                    position: position,
                    day: newDay,
                };
            }
            // Otherwise check race history
            var historyEntry = horse.raceHistory.find(function (rh) { return rh.raceId === tcRace.key || rh.raceName === tcRace.name; });
            return {
                raceKey: tcRace.key,
                position: (_b = historyEntry === null || historyEntry === void 0 ? void 0 : historyEntry.position) !== null && _b !== void 0 ? _b : 999,
                day: (_c = historyEntry === null || historyEntry === void 0 ? void 0 : historyEntry.day) !== null && _c !== void 0 ? _c : 0,
            };
        });
        // Check if won all legs (all positions === 1)
        var won = legs.every(function (leg) { return leg.position === 1; });
        return {
            id: (0, uuid_1.generateUUID)(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "always",
            type: "triple_crown_progress",
            horseId: horse.id,
            triplecrownKey: triplecrownKey_1,
            year: currentYear,
            legs: legs,
            won: won,
            reason: won
                ? "Triple Crown winner! ".concat(horse.name, " won ").concat(triplecrownKey_1)
                : "Triple Crown progress updated for ".concat(horse.name),
        };
    }
    return null;
}
/**
 * Generate prize money impacts for a horse.
 * @param horse - The horse to generate prize money for
 * @param position - Finishing position (1-based)
 * @param race - The race data
 * @param newDay - Current game day
 * @returns Object containing the cash impact and optional transaction and reputation impacts, or null if no prize.
 */
function generatePrizeMoneyImpacts(horse, position, race, newDay, rng) {
    var _a;
    var prizeSplit = getPrizeSplitForRace(race);
    if (position - 1 >= prizeSplit.length)
        return null;
    var prize = Math.round(race.purse * prizeSplit[position - 1]);
    if (prize <= 0)
        return null;
    var cashImpact = {
        id: (0, uuid_1.generateUUID)(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "cash_change",
        entityId: horse.stableId || "",
        amount: prize,
        reason: "Prize money: ".concat(position).concat((0, ordinal_1.getOrdinalSuffix)(position), " in ").concat(race.name),
    };
    var transactionImpact;
    var reputationImpact;
    // Player-specific impacts
    if (!horse.stableId) {
        transactionImpact = {
            id: (0, uuid_1.generateUUID)(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "transaction",
            amount: prize,
            category: "prize_money",
            description: "Prize money: ".concat(position).concat((0, ordinal_1.getOrdinalSuffix)(position), " in ").concat(race.name),
            metadata: { horseId: horse.id, raceId: race.id },
        };
        // Reputation: Manager reputation increases for wins
        if (position === 1) {
            var repGain = (0, reputation_1.calculateRaceWinReputation)((_a = race.graded) === null || _a === void 0 ? void 0 : _a.grade, race.purse);
            reputationImpact = {
                id: (0, uuid_1.generateUUID)(rng),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "always",
                type: "reputation_change",
                delta: repGain,
                source: "race_win",
                reason: "Win in ".concat(race.name).concat(race.graded ? " (".concat(race.graded.grade, ")") : ""),
                metadata: { horseId: horse.id, raceId: race.id },
            };
        }
    }
    return { cashImpact: cashImpact, transactionImpact: transactionImpact, reputationImpact: reputationImpact };
}
/**
 * Generate jockey fee impacts for a horse.
 * @param horse - The horse that ran the race
 * @param jockey - The jockey who rode the horse
 * @param newDay - Current game day
 * @param horseId - The horse ID (for stable identification)
 * @param raceId - The race ID
 * @returns Object containing the cash impact and optional transaction impact.
 */
function generateJockeyFeeImpacts(horse, jockey, newDay, horseId, raceId, rng) {
    var ridingFee = jockey.ridingFee || gameConstants_1.BASE_JOCKEY_RIDING_FEE;
    var cashImpact = {
        id: (0, uuid_1.generateUUID)(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "cash_change",
        entityId: horse.stableId || "",
        amount: -ridingFee,
        reason: "Jockey fee: ".concat(jockey.name),
    };
    var transactionImpact;
    // Player-specific transaction
    if (!horse.stableId) {
        transactionImpact = {
            id: (0, uuid_1.generateUUID)(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "conditional",
            type: "transaction",
            amount: -ridingFee,
            category: "jockey_fee",
            description: "Jockey fee: ".concat(jockey.name, " for ").concat(horse.name),
            metadata: { horseId: horseId, raceId: raceId },
        };
    }
    return { cashImpact: cashImpact, transactionImpact: transactionImpact };
}
/**
 * Generate percentage-based jockey fee impacts (10% of purse earnings).
 * @param jockey
 * @param winAmount
 * @param newDay
 * @param owned
 * @param stableId
 * @returns The cash impact object, or null if no fee applies.
 */
function generatePercentageJockeyFeeImpacts(jockey, winAmount, newDay, owned, stableId, rng) {
    var jockeyFee = Math.round(winAmount * gameConstants_1.JOCKEY_FEE_PERCENTAGE); // Jockeys take 10% of purse earnings
    if (jockeyFee <= 0)
        return null;
    return {
        id: (0, uuid_1.generateUUID)(rng),
        intentId: "",
        day: newDay,
        phase: "raceResolution",
        logLevel: "conditional",
        type: "cash_change",
        entityId: owned ? "" : stableId || "",
        amount: -jockeyFee,
        reason: "Jockey fee for ".concat(jockey.name),
    };
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
 * @param props.race - The completed race data
 * @param props.result - Final race result positions and times for each participant
 * @param props.runners - The field of runners with lane and barrier data
 * @param props.horses - Current horse population (can be an array or a pre-indexed Map)
 * @param props.jockeys - Current jockey population (can be an array or a pre-indexed Map)
 * @param props.newDay - Game day of the race resolution
 * @param props.stateCash - Current player cash balance
 * @param props.stateReputation - Current manager reputation state
 * @param props.hiredStaff - Active staff members with potential bonuses
 * @param props.rng - Optional random number generator for stochastic events (e.g., injuries)
 * @param props.snapshots - Optional detailed race snapshots for replay/summary purposes
 * @param props.calibratedPars - Speed pars for Beyer speed figure calculation, indexed by distance
 * @returns Array of impacts to be applied to the game state by the resolver
 */
function generateRaceImpacts(_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    var race = _a.race, result = _a.result, runners = _a.runners, horses = _a.horses, jockeys = _a.jockeys, newDay = _a.newDay, stateCash = _a.stateCash, stateReputation = _a.stateReputation, _x = _a.hiredStaff, hiredStaff = _x === void 0 ? [] : _x, rng = _a.rng, _y = _a.snapshots, snapshots = _y === void 0 ? [] : _y, calibratedPars = _a.calibratedPars;
    try {
        var impacts = [];
        var classBonus = (0, classBonus_1.calculateClassBonus)((_b = race.graded) === null || _b === void 0 ? void 0 : _b.grade, race.raceClass);
        // Normalize collections to Maps for O(1) lookups
        var horseMap_1 = horses instanceof Map
            ? horses
            : new Map(horses.map(function (h) { return [h.id, h]; }));
        var jockeyMap = jockeys instanceof Map
            ? jockeys
            : new Map(jockeys.map(function (j) { return [j.id, j]; }));
        var runnersMap = new Map(runners.map(function (run) { return [run.horseId, run]; }));
        var entriesMap = new Map(race.entries.map(function (e) { return [e.horseId, e]; }));
        // 1. Record the overall race result
        impacts.push({
            id: (0, uuid_1.generateUUID)(rng),
            intentId: "",
            day: newDay,
            phase: "raceResolution",
            logLevel: "always",
            type: "race_result",
            raceId: race.id,
            results: result.map(function (_a) {
                var horseId = _a.horseId, position = _a.position, time = _a.time;
                return ({ horseId: horseId, position: position, time: time });
            }),
            snapshots: snapshots,
            reason: "Race resolved",
        });
        // Compute sectional splits if snapshots are available
        if (snapshots && snapshots.length > 0) {
            race.sectionalSplits = (0, sectionalAnalysis_1.computeSectionalSplits)(snapshots, race.distance);
        }
        var _loop_1 = function (r) {
            var horse = horseMap_1.get(r.horseId);
            if (!horse)
                return "continue";
            var runner = runnersMap.get(r.horseId);
            // Energy expenditure
            impacts.push(generateEnergyImpact(horse.id, newDay, rng));
            // Health: Roll for potential injuries
            if (rng) {
                var injury = (0, healthSystem_1.rollForInjury)(rng, horse, newDay, hiredStaff);
                if (injury) {
                    impacts.push(injury);
                }
            }
            // Form change
            impacts.push(generateFormImpact(horse, r.position, newDay, hiredStaff, rng));
            // Fame change
            var fameImpact = generateFameImpact(horse, r.position, newDay, rng);
            if (fameImpact) {
                impacts.push(fameImpact);
            }
            // Beyer and recovery impacts
            var _z = generateBeyerAndRecoveryImpacts(horse, r.position, r.time, race, classBonus, calibratedPars, newDay, rng), beyerImpact = _z.beyerImpact, recoveryImpact = _z.recoveryImpact;
            impacts.push(beyerImpact, recoveryImpact);
            // --- PATTERN JUMP DETECTION ---
            // Only push notifications for Graded races (G1, G2, G3)
            if (race.graded) {
                var _0 = (0, beyer_1.detectPatternJump)(horse, beyerImpact.beyer), jumped = _0.jumped, margin = _0.margin;
                if (jumped) {
                    var isAdverseWeather = race.weather === "storm" ||
                        race.weather === "rainy" ||
                        race.trackCondition === "heavy" ||
                        race.trackCondition === "soft" ||
                        race.trackCondition === "yielding";
                    var title = isAdverseWeather
                        ? "Storm Performance: ".concat(horse.name)
                        : "Performance Spike: ".concat(horse.name);
                    var weatherNote = isAdverseWeather
                        ? " Despite the ".concat(race.weather, " weather and ").concat(race.trackCondition, " track, this horse thrived in the adverse conditions.")
                        : " This horse is on a sharp upward trajectory.";
                    impacts.push({
                        id: (0, uuid_1.generateUUID)(rng),
                        intentId: "",
                        day: newDay,
                        phase: "raceResolution",
                        logLevel: "always",
                        type: "inbox_message",
                        message: {
                            day: newDay,
                            category: "race",
                            priority: "info",
                            title: title,
                            body: "".concat(horse.name, " produced a massive performance jump in the ").concat(race.name, ", earning a ").concat(beyerImpact.beyer, " Beyer figure (+").concat(Math.round(margin), " improvement).").concat(weatherNote),
                            cta: {
                                label: "View Horse",
                                route: "stable.$horseId",
                                params: { horseId: horse.id },
                            },
                        },
                    });
                }
            }
            // Race history impact
            var trackId = race.trackId || ((_c = race.graded) === null || _c === void 0 ? void 0 : _c.trackId);
            var pacePositions = (_d = race.sectionalSplits) === null || _d === void 0 ? void 0 : _d.map(function (split) {
                var _a;
                var entry = split.entries.find(function (e) { return e.horseId === horse.id; });
                return (_a = entry === null || entry === void 0 ? void 0 : entry.rank) !== null && _a !== void 0 ? _a : 0;
            });
            // Store visits BEFORE this race; handler increments by 1 when applying
            var courseVisitCount = trackId ? ((_f = (_e = horse.courseVisits) === null || _e === void 0 ? void 0 : _e[trackId]) !== null && _f !== void 0 ? _f : 0) : undefined;
            var historyImpact = generateRaceHistoryImpact(horse, r.position, r.time, race, beyerImpact.beyer, newDay, runner, rng);
            historyImpact.raceHistoryEntry.fieldSize = result.length;
            historyImpact.raceHistoryEntry.pacePositions = pacePositions;
            historyImpact.raceHistoryEntry.courseVisitCount = courseVisitCount;
            impacts.push(historyImpact);
            // Triple Crown progress
            var tcImpact = generateTripleCrownProgressImpact(horse, r.position, race, newDay, rng);
            if (tcImpact) {
                impacts.push(tcImpact);
            }
            // Prize money distribution
            var prizeImpacts = generatePrizeMoneyImpacts(horse, r.position, race, newDay, rng);
            if (prizeImpacts) {
                impacts.push(prizeImpacts.cashImpact);
                if (prizeImpacts.transactionImpact)
                    impacts.push(prizeImpacts.transactionImpact);
                if (prizeImpacts.reputationImpact)
                    impacts.push(prizeImpacts.reputationImpact);
            }
            // Jockey riding fees
            var entry = entriesMap.get(horse.id);
            if (entry === null || entry === void 0 ? void 0 : entry.jockeyId) {
                var jockey = jockeyMap.get(entry.jockeyId);
                if (jockey) {
                    var jockeyFeeImpacts = generateJockeyFeeImpacts(horse, jockey, newDay, horse.id, race.id, rng);
                    impacts.push(jockeyFeeImpacts.cashImpact);
                    if (jockeyFeeImpacts.transactionImpact)
                        impacts.push(jockeyFeeImpacts.transactionImpact);
                    // --- AFFINITY XP GAIN ---
                    var xpGain = affinity_1.AFFINITY_CONSTANTS.XP_PER_RACE +
                        (r.position === 1 ? affinity_1.AFFINITY_CONSTANTS.XP_PER_WIN_BONUS : 0);
                    impacts.push({
                        id: (0, uuid_1.generateUUID)(rng),
                        intentId: "",
                        day: newDay,
                        phase: "raceResolution",
                        logLevel: "conditional",
                        type: "jockey_affinity_gain",
                        jockeyId: jockey.id,
                        horseId: horse.id,
                        xp: xpGain,
                        reason: "Raced ".concat(horse.name, " to ").concat(r.position).concat((0, ordinal_1.getOrdinalSuffix)(r.position)),
                    });
                    // --- END AFFINITY XP GAIN ---
                }
            }
            // 5. Breeding: "Blue Hen" status tracking for high-performing mares
            if (r.position === 1 &&
                (race.graded || race.raceClass === "Stakes" || race.raceClass === "Group")) {
                var dam = ((_g = horse.pedigree) === null || _g === void 0 ? void 0 : _g.damId) ? horseMap_1.get(horse.pedigree.damId) : undefined;
                if (dam) {
                    impacts.push({
                        id: (0, uuid_1.generateUUID)(rng),
                        intentId: "",
                        day: newDay,
                        phase: "raceResolution",
                        logLevel: "conditional",
                        type: "blue hen_status",
                        horseId: dam.id,
                        blueHenStatus: {
                            isBlueHen: ((_h = dam.blueHenStatus) === null || _h === void 0 ? void 0 : _h.isBlueHen) || false,
                            stakesWinnersProduced: ((_k = (_j = dam.blueHenStatus) === null || _j === void 0 ? void 0 : _j.stakesWinnersProduced) !== null && _k !== void 0 ? _k : 0) + 1,
                            group1WinnersProduced: ((_l = race.graded) === null || _l === void 0 ? void 0 : _l.grade) === "G1"
                                ? ((_o = (_m = dam.blueHenStatus) === null || _m === void 0 ? void 0 : _m.group1WinnersProduced) !== null && _o !== void 0 ? _o : 0) + 1
                                : (_p = dam.blueHenStatus) === null || _p === void 0 ? void 0 : _p.group1WinnersProduced,
                            blueHenScore: ((_q = dam.blueHenStatus) === null || _q === void 0 ? void 0 : _q.blueHenScore) || 0,
                            foalsProduced: ((_r = dam.blueHenStatus) === null || _r === void 0 ? void 0 : _r.foalsProduced) || 0,
                        },
                        reason: "Stakes win by ".concat(horse.name),
                    });
                }
                // 6. Breeding: Stallion stud career and fee recalibration
                var sire = ((_s = horse.pedigree) === null || _s === void 0 ? void 0 : _s.sireId) ? horseMap_1.get(horse.pedigree.sireId) : undefined;
                if (sire && ((_t = sire.stud) === null || _t === void 0 ? void 0 : _t.atStud)) {
                    var newStakesFoals = ((_u = sire.stud.lifetimeStakesFoals) !== null && _u !== void 0 ? _u : 0) + 1;
                    var newG1Foals = ((_v = race.graded) === null || _v === void 0 ? void 0 : _v.grade) === "G1"
                        ? ((_w = sire.stud.lifetimeG1Foals) !== null && _w !== void 0 ? _w : 0) + 1
                        : sire.stud.lifetimeG1Foals;
                    var previousFee = sire.stud.standingFee;
                    var newFee = sire.stableId
                        ? (0, stallions_1.recalcStandingFee)(__assign(__assign({}, sire), { stud: __assign(__assign({}, sire.stud), { lifetimeStakesFoals: newStakesFoals, lifetimeG1Foals: newG1Foals }) }), { horses: Array.from(horseMap_1.values()), npcStables: [] })
                        : sire.stud.standingFee;
                    impacts.push({
                        id: (0, uuid_1.generateUUID)(rng),
                        intentId: "",
                        day: newDay,
                        phase: "raceResolution",
                        logLevel: "conditional",
                        type: "stud_career",
                        horseId: sire.id,
                        studCareer: __assign(__assign({}, sire.stud), { standingFee: newFee, previousStandingFee: previousFee, lifetimeStakesFoals: newStakesFoals, lifetimeG1Foals: newG1Foals }),
                        reason: "Stakes win by ".concat(horse.name).concat(sire.stableId ? ". Fee: $".concat((0, formatting_1.formatCurrency)(previousFee), " \u2192 $").concat((0, formatting_1.formatCurrency)(newFee), ".") : ""),
                    });
                }
            }
            // 7. Jockey performance and stats tracking
            var raceEntry = entriesMap.get(horse.id);
            var prizeSplit = getPrizeSplitForRace(race);
            if ((raceEntry === null || raceEntry === void 0 ? void 0 : raceEntry.jockeyId) && r.position - 1 < prizeSplit.length) {
                var jockey = jockeyMap.get(raceEntry.jockeyId);
                if (jockey) {
                    var winAmount = prizeSplit[r.position - 1] * race.purse;
                    impacts.push({
                        id: (0, uuid_1.generateUUID)(rng),
                        intentId: "",
                        day: newDay,
                        phase: "raceResolution",
                        logLevel: "conditional",
                        type: "jockey_stats",
                        jockeyId: jockey.id,
                        careerStarts: jockey.careerStarts + 1,
                        careerWins: jockey.careerWins + (r.position === 1 ? 1 : 0),
                        fame: Math.min(gameConstants_1.MAX_FAME, jockey.fame + (r.position === 1 ? 2 : r.position <= 3 ? 0.5 : 0)),
                        reason: "Rode ".concat(horse.name, " to ").concat(r.position).concat((0, ordinal_1.getOrdinalSuffix)(r.position)),
                    });
                    var percentageFeeImpact = generatePercentageJockeyFeeImpacts(jockey, winAmount, newDay, raceEntry.owned || false, raceEntry.stableId, rng);
                    if (percentageFeeImpact) {
                        impacts.push(percentageFeeImpact);
                    }
                }
            }
        };
        // 2. Process per-horse consequences
        for (var _i = 0, result_1 = result; _i < result_1.length; _i++) {
            var r = result_1[_i];
            _loop_1(r);
        }
        // 8. Analytics: Global pace samples for handicapping logic
        if (result.length > 0) {
            var winner = result[0];
            impacts.push({
                id: (0, uuid_1.generateUUID)(rng),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "conditional",
                type: "pace_sample",
                distance: race.distance,
                time: winner.time,
                reason: "Pace sample from ".concat(race.name),
            });
        }
        // 9. Narrative: Generate race summary logs for the player
        var ownedHorses = result.filter(function (r) {
            var horse = horseMap_1.get(r.horseId);
            return horse && !horse.stableId;
        });
        if (ownedHorses.length > 0) {
            var summary = ownedHorses
                .map(function (r) {
                var horse = horseMap_1.get(r.horseId);
                return "".concat(horse === null || horse === void 0 ? void 0 : horse.name, " ").concat(r.position).concat((0, ordinal_1.getOrdinalSuffix)(r.position));
            })
                .join(", ");
            var prize = ownedHorses.reduce(function (sum, r) {
                var prizeSplit = getPrizeSplitForRace(race);
                if (r.position - 1 < prizeSplit.length) {
                    return sum + Math.round(race.purse * prizeSplit[r.position - 1]);
                }
                return sum;
            }, 0);
            impacts.push({
                id: (0, uuid_1.generateUUID)(rng),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "always",
                type: "log",
                text: "".concat(race.name, " \u2014 ").concat(summary).concat(prize > 0 ? " (won ".concat((0, formatting_1.formatCurrency)(prize), ")") : ""),
                reason: "Race summary",
            });
        }
        // 10. Narrative: Dynamic news generation for major races
        var newsItem = (0, newsGenerator_1.generateRaceNews)(race, result, Array.from(horseMap_1.values()), newDay, rng);
        if (newsItem) {
            impacts.push({
                id: (0, uuid_1.generateUUID)(rng),
                intentId: "",
                day: newDay,
                phase: "raceResolution",
                logLevel: "always",
                type: "news_item",
                newsItem: newsItem,
            });
        }
        return impacts;
    }
    catch (error) {
        console.error("Error in generateRaceImpacts:", error);
        // Return empty impacts array on error to prevent corruption
        return [];
    }
}
