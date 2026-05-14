"use strict";
/**
 * breedingCompatibility.ts - Breeding compatibility calculation
 *
 * This file provides comprehensive breeding compatibility scoring including genetic
 * compatibility, founder effect, conformation/temperament compatibility, COI,
 * nicking affinities, and blue hen contribution.
 *
 * Dependencies: ./types (Horse), ./dosage (calculateDosageMetrics, interpretDosageIndex), @/core/data/pedigreeData (findHorseByName, PedigreeHorse), @/core/genetics/phenotype (TRAIT_SCORE), @/services/genotypeMatching (calculateGeneticCompatibility), @/services/inbreedingCalculator (calculateFounderEffect), @/services/traitCompatibility (calculateConformationCompatibility, calculateTemperamentCompatibility), @/core/breeding/populationGenetics (computeCoiFromSnapshot), @/core/breeding/breedingAffinityData (NICKING_AFFINITIES, CROSS_FAMILY_AFFINITIES)
 * Related files: Used throughout breeding systems for compatibility evaluation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeProspectiveCoi = exports.calculateTemperamentCompatibility = exports.calculateConformationCompatibility = exports.calculateFounderEffect = exports.calculateGeneticCompatibility = void 0;
exports.calculateBlueHenContribution = calculateBlueHenContribution;
exports.calculateFoundationStockProximity = calculateFoundationStockProximity;
exports.checkNickingAffinity = checkNickingAffinity;
exports.calculateDosageCompatibility = calculateDosageCompatibility;
exports.calculateParentPerformance = calculateParentPerformance;
exports.calculateCrossFamilyAffinity = calculateCrossFamilyAffinity;
exports.calculateBreedingCompatibility = calculateBreedingCompatibility;
var dosage_1 = require("./dosage");
var pedigreeData_1 = require("@/core/data/pedigreeData");
var genotypeMatching_1 = require("@/services/genotypeMatching");
Object.defineProperty(exports, "calculateGeneticCompatibility", { enumerable: true, get: function () { return genotypeMatching_1.calculateGeneticCompatibility; } });
var inbreedingCalculator_1 = require("@/services/inbreedingCalculator");
Object.defineProperty(exports, "calculateFounderEffect", { enumerable: true, get: function () { return inbreedingCalculator_1.calculateFounderEffect; } });
var traitCompatibility_1 = require("@/services/traitCompatibility");
Object.defineProperty(exports, "calculateConformationCompatibility", { enumerable: true, get: function () { return traitCompatibility_1.calculateConformationCompatibility; } });
Object.defineProperty(exports, "calculateTemperamentCompatibility", { enumerable: true, get: function () { return traitCompatibility_1.calculateTemperamentCompatibility; } });
var populationGenetics_1 = require("@/core/breeding/populationGenetics");
Object.defineProperty(exports, "computeProspectiveCoi", { enumerable: true, get: function () { return populationGenetics_1.computeProspectiveCoi; } });
var breedingAffinityData_1 = require("@/core/breeding/breedingAffinityData");
var stats_1 = require("@/core/horse/stats");
/**
 * Calculate blue hen contribution based on dam's production record.
 *
 * Based on the Breednet article on Blue Hens. Blue hens are exceptional broodmares
 * that produce multiple high-quality offspring, often including multiple Group 1 winners.
 * Blue hen status is determined by the quality and quantity of offspring.
 *
 * @param dam - Dam horse to evaluate
 * @returns Object with score (0-1), description, and blue hen status
 */
function calculateBlueHenContribution(dam) {
    var blueHenStatus = dam.blueHenStatus;
    if (!blueHenStatus) {
        return { score: 0.3, description: "Unknown production record", isBlueHen: false };
    }
    var score = 0.3; // Base score for any mare
    // Bonus for stakes winners
    score += Math.min(blueHenStatus.stakesWinnersProduced * 0.15, 0.3);
    // Bonus for Group 1 winners (more valuable)
    score += Math.min(blueHenStatus.group1WinnersProduced * 0.25, 0.3);
    // Blue hen score contribution
    score += (blueHenStatus.blueHenScore / 100) * 0.1;
    score = Math.min(score, 1.0);
    var isBlueHen = blueHenStatus.isBlueHen;
    var description = "Standard production record";
    if (isBlueHen) {
        description = "Blue Hen - ".concat(blueHenStatus.stakesWinnersProduced, " stakes winners, ").concat(blueHenStatus.group1WinnersProduced, " G1 winners");
    }
    else if (blueHenStatus.stakesWinnersProduced >= 2) {
        description = "Excellent producer - ".concat(blueHenStatus.stakesWinnersProduced, " stakes winners");
    }
    else if (blueHenStatus.stakesWinnersProduced >= 1) {
        description = "Good producer - ".concat(blueHenStatus.stakesWinnersProduced, " stakes winner").concat(blueHenStatus.stakesWinnersProduced > 1 ? "s" : "");
    }
    return { score: score, description: description, isBlueHen: isBlueHen };
}
/**
 * Calculate foundation stock proximity score.
 *
 * Horses closer to foundation stock (especially the 3 major sires and foundation mares)
 * get a bonus. Based on the Wikipedia article on Foundation Stock which notes the
 * importance of tracing to foundation animals.
 *
 * @param sireName - Name of the sire
 * @param damName - Name of the dam
 * @returns Object with score (0-0.5) and description
 */
function calculateFoundationStockProximity(sireName, damName) {
    var sire = (0, pedigreeData_1.findHorseByName)(sireName);
    var dam = (0, pedigreeData_1.findHorseByName)(damName);
    if (!sire || !dam) {
        return { score: 0, description: "Unknown pedigree" };
    }
    var score = 0;
    var reasons = [];
    // Check for major foundation sires in pedigree (within 4 generations)
    var majorFoundationSires = ["Byerley Turk", "Darley Arabian", "Godolphin Arabian"];
    function checkForFoundationInLine(horse, depth) {
        if (depth === void 0) { depth = 0; }
        if (depth > 4 || !horse)
            return;
        if (horse.isFoundationSire) {
            if (majorFoundationSires.includes(horse.name)) {
                score += 0.15; // Major foundation sire
                reasons.push("Major foundation sire ".concat(horse.name, " in pedigree"));
            }
            else {
                score += 0.05; // Minor foundation sire
                reasons.push("Minor foundation sire ".concat(horse.name, " in pedigree"));
            }
        }
        if (horse.isFoundationMare) {
            score += 0.1; // Foundation mare
            reasons.push("Foundation mare ".concat(horse.name, " (Family ").concat(horse.bruceLoweFamily, ")"));
        }
        if (horse.sire) {
            var sireHorse = (0, pedigreeData_1.findHorseByName)(horse.sire);
            if (sireHorse)
                checkForFoundationInLine(sireHorse, depth + 1);
        }
    }
    // Check sire line
    checkForFoundationInLine(sire);
    // Check dam line (tail-female is especially important)
    checkForFoundationInLine(dam);
    // Bonus for Bruce Lowe family consistency (same family on both sides can be good or bad depending on context)
    if (sire.bruceLoweFamily && dam.bruceLoweFamily) {
        if (sire.bruceLoweFamily === dam.bruceLoweFamily) {
            score += 0.05; // Same family - can indicate strong linebreeding
            reasons.push("Both from Bruce Lowe Family ".concat(sire.bruceLoweFamily));
        }
    }
    // Cap the score at 1.0 (normalized for weighting)
    score = Math.min(score * 2, 1.0);
    var description = "Limited foundation stock proximity";
    if (score >= 0.8)
        description = "Excellent foundation stock proximity";
    else if (score >= 0.5)
        description = "Strong foundation stock proximity";
    else if (score >= 0.3)
        description = "Moderate foundation stock proximity";
    else if (score >= 0.1)
        description = "Some foundation stock influence";
    if (reasons.length > 0) {
        description += " (".concat(reasons.slice(0, 2).join(", "), ")");
    }
    return { score: score, description: description };
}
/**
 * Check if there's a nicking affinity between sire and dam lines.
 *
 * Checks the nicking database for known successful sire × dam sire combinations.
 * Returns affinity score and description if found.
 *
 * @param sireName - Name of the sire
 * @param damName - Name of the dam
 * @returns Object with hasAffinity flag, affinity score, and description
 */
function checkNickingAffinity(sireName, damName) {
    var sire = (0, pedigreeData_1.findHorseByName)(sireName);
    var dam = (0, pedigreeData_1.findHorseByName)(damName);
    if (!sire || !dam) {
        return { hasAffinity: false, affinity: 0, description: "Unknown pedigree" };
    }
    // Check if sire is in our nicking database
    var sireLine = sire.sire || sire.name;
    var damSireLine = dam.sire;
    if (!damSireLine) {
        return { hasAffinity: false, affinity: 0, description: "No dam sire data" };
    }
    // Check for direct nicking affinity
    var affinities = breedingAffinityData_1.NICKING_AFFINITIES[sireLine] || [];
    if (affinities.includes(damSireLine)) {
        return {
            hasAffinity: true,
            affinity: 1.0, // Strong nicking
            description: "Strong nicking: ".concat(sireLine, " \u00D7 ").concat(damSireLine),
        };
    }
    // Check if dam's sire is in the same general sire line family
    var damSire = (0, pedigreeData_1.findHorseByName)(damSireLine);
    if (damSire && damSire.sire) {
        var grandSire = damSire.sire;
        if (affinities.includes(grandSire)) {
            return {
                hasAffinity: true,
                affinity: 0.5, // Moderate nicking
                description: "Moderate nicking: ".concat(sireLine, " \u00D7 ").concat(damSireLine, " (via ").concat(grandSire, ")"),
            };
        }
    }
    return { hasAffinity: false, affinity: 0, description: "No known nicking" };
}
/**
 * Calculate dosage compatibility between sire and dam.
 *
 * Returns a score from 0-1, with higher being better compatibility.
 * Ideal breeding balances speed and stamina: high-speed sires should breed to
 * stamina-oriented dams for complementary dosage profiles.
 *
 * @param sireName - Name of the sire
 * @param damName - Name of the dam
 * @returns Object with score (0-1) and description
 */
function calculateDosageCompatibility(sireName, damName) {
    var sireMetrics = (0, dosage_1.calculateDosageMetrics)(sireName);
    var damMetrics = (0, dosage_1.calculateDosageMetrics)(damName);
    var sireDI = sireMetrics.dosageIndex;
    var damDI = damMetrics.dosageIndex;
    // If we can't calculate dosage for one or both
    if (!isFinite(sireDI) || !isFinite(damDI)) {
        return { score: 0.5, description: "Insufficient pedigree data" };
    }
    // Ideal: balance speed and stamina
    // If sire is high-speed (high DI), breed to stamina-oriented dam (low DI)
    // If both are similar, it's okay but not optimal
    var diff = Math.abs(sireDI - damDI);
    if (diff < 0.5) {
        // Similar dosage profiles - neutral
        return { score: 0.6, description: "Similar dosage profiles" };
    }
    else if (diff < 1.5) {
        // Good balance
        return { score: 0.8, description: "Good speed/stamina balance" };
    }
    else if (diff < 2.5) {
        // Excellent complementary profiles
        return { score: 0.95, description: "Excellent complementary dosage" };
    }
    else {
        // Too different - may not work well
        return { score: 0.4, description: "Very different dosage profiles" };
    }
}
/**
 * Calculate parent performance score based on race history.
 *
 * "Breed the best to the best" - good racehorses make better breeding stock.
 * Evaluates both sire and dam performance including wins, places, and graded stakes results.
 *
 * @param sire - Sire horse to evaluate
 * @param dam - Dam horse to evaluate
 * @returns Object with score (0-1) and description
 */
function calculateParentPerformance(sire, dam) {
    var sireScore = 0;
    var damScore = 0;
    // Evaluate sire's performance
    var sireStats = (0, stats_1.getCareerStats)(sire);
    var sireWins = sireStats.wins;
    var sirePlaces = sireStats.wins + sireStats.places + sireStats.shows;
    var sireGraded = sire.raceHistory.filter(function (r) { return r.grade; }).length;
    var sireGradedWins = sireStats.gradedWins;
    // Sire scoring
    sireScore += sireWins * 2;
    sireScore += sirePlaces * 0.5;
    sireScore += sireGradedWins * 5; // Bonus for graded wins
    sireScore += sireGraded * 0.5; // Bonus for graded appearances
    // Evaluate dam's performance (mares can outbreed their track record)
    var damStats = (0, stats_1.getCareerStats)(dam);
    var damWins = damStats.wins;
    var damPlaces = damStats.wins + damStats.places + damStats.shows;
    var damGraded = damStats.gradedStarts;
    var damGradedWins = damStats.gradedWins;
    // Dam scoring (slightly higher weight as quality mares produce high-class runners)
    damScore += damWins * 2.5;
    damScore += damPlaces * 0.75;
    damScore += damGradedWins * 6;
    damScore += damGraded * 0.75;
    // Normalize scores
    var maxScore = 50; // Arbitrary maximum
    var combinedScore = Math.min(sireScore + damScore, maxScore);
    var normalizedScore = combinedScore / maxScore;
    var description = "Limited race record";
    if (normalizedScore > 0.8)
        description = "Exceptional racing performers";
    else if (normalizedScore > 0.6)
        description = "Strong racing performers";
    else if (normalizedScore > 0.4)
        description = "Moderate racing performers";
    else if (normalizedScore > 0.2)
        description = "Some racing success";
    return { score: normalizedScore, description: description };
}
/**
 * Calculate cross-family affinity between sire bloodline and dam Bruce Lowe family.
 *
 * Checks documented cross-family affinities where certain sire bloodlines
 * have historically produced well with specific Bruce Lowe families.
 *
 * @param sire - Sire horse to evaluate
 * @param dam - Dam horse to evaluate
 * @returns Object with score (0-1) and description
 */
function calculateCrossFamilyAffinity(sire, dam) {
    var _a;
    var bloodline = sire.bloodline;
    var family = dam.bruceLoweFamily;
    if (!bloodline || family === undefined || !breedingAffinityData_1.CROSS_FAMILY_AFFINITIES[bloodline]) {
        return { score: 0.4, description: "No documented cross-family affinity" };
    }
    var bonus = (_a = breedingAffinityData_1.CROSS_FAMILY_AFFINITIES[bloodline][family]) !== null && _a !== void 0 ? _a : 0.4;
    if (bonus >= 0.7) {
        return { score: bonus, description: "Strong cross: ".concat(bloodline, " \u00D7 Family ").concat(family) };
    }
    if (bonus >= 0.55) {
        return { score: bonus, description: "Notable cross: ".concat(bloodline, " \u00D7 Family ").concat(family) };
    }
    return { score: bonus, description: "Standard cross: ".concat(bloodline, " \u00D7 Family ").concat(family) };
}
/**
 * Calculate overall breeding compatibility score.
 *
 * Combines all factors with appropriate weights: nicking, dosage, inbreeding,
 * parent performance, conformation, temperament, foundation stock, founder effect,
 * genetic compatibility, blue hen contribution, and cross-family affinity.
 *
 * @param sire - Sire horse to evaluate
 * @param dam - Dam horse to evaluate
 * @returns Comprehensive breeding compatibility result with overall score, individual factor scores, and recommendation
 */
function calculateBreedingCompatibility(sire, dam) {
    var nicking = checkNickingAffinity(sire.sireName || "", dam.sireName || "");
    var dosage = calculateDosageCompatibility(sire.sireName || "", dam.sireName || "");
    var coi = (0, populationGenetics_1.computeProspectiveCoi)(sire, dam, 8);
    var inbreeding = {
        coefficient: coi,
        warning: coi > 0.125
            ? "High inbreeding - may reduce vigor"
            : coi > 0.0625
                ? "Moderate inbreeding - monitor closely"
                : "",
    };
    var parentPerformance = calculateParentPerformance(sire, dam);
    var conformation = (0, traitCompatibility_1.calculateConformationCompatibility)(sire, dam);
    var temperament = (0, traitCompatibility_1.calculateTemperamentCompatibility)(sire, dam);
    var foundationStock = calculateFoundationStockProximity(sire.sireName || "", dam.sireName || "");
    var founderEffect = (0, inbreedingCalculator_1.calculateFounderEffect)(sire.sireName || "", dam.sireName || "");
    var genetic = (0, genotypeMatching_1.calculateGeneticCompatibility)(sire, dam);
    var blueHen = calculateBlueHenContribution(dam);
    var crossFamily = calculateCrossFamilyAffinity(sire, dam);
    // Calculate inbreeding score (inverse of coefficient - lower is better)
    var inbreedingScore = Math.max(0, 1 - inbreeding.coefficient * 4); // Penalize high inbreeding
    // Weighted overall score (11 factors, sums to 1.0). Cross-family takes 5%
    // pulled proportionally from the larger factors.
    var weights = {
        nicking: 0.07,
        dosage: 0.07,
        inbreeding: 0.13,
        parentPerformance: 0.15,
        conformation: 0.07,
        temperament: 0.05,
        foundationStock: 0.09,
        founderEffect: 0.09,
        genetic: 0.11,
        blueHen: 0.11,
        crossFamily: 0.06,
    };
    var overallScore = nicking.affinity * weights.nicking +
        dosage.score * weights.dosage +
        inbreedingScore * weights.inbreeding +
        parentPerformance.score * weights.parentPerformance +
        conformation.score * weights.conformation +
        temperament.score * weights.temperament +
        foundationStock.score * weights.foundationStock +
        founderEffect.score * weights.founderEffect +
        genetic.score * weights.genetic +
        blueHen.score * weights.blueHen +
        crossFamily.score * weights.crossFamily;
    // Generate recommendation
    var recommendation = "";
    if (overallScore >= 0.8) {
        recommendation = "Excellent mating - highly recommended";
    }
    else if (overallScore >= 0.65) {
        recommendation = "Good mating - should produce quality foal";
    }
    else if (overallScore >= 0.5) {
        recommendation = "Acceptable mating - moderate expectations";
    }
    else if (overallScore >= 0.35) {
        recommendation = "Risky mating - low probability of success";
    }
    else {
        recommendation = "Poor mating - not recommended";
    }
    if (inbreeding.warning) {
        recommendation += ". ".concat(inbreeding.warning);
    }
    if (founderEffect.warning) {
        recommendation += ". ".concat(founderEffect.warning);
    }
    if (genetic.warning) {
        recommendation += ". ".concat(genetic.warning);
    }
    return {
        overallScore: overallScore,
        factors: {
            nicking: { score: nicking.affinity, description: nicking.description },
            dosage: dosage,
            inbreeding: {
                score: inbreedingScore,
                description: "Coefficient: ".concat((inbreeding.coefficient * 100).toFixed(1), "%"),
                warning: inbreeding.warning,
            },
            parentPerformance: parentPerformance,
            conformation: conformation,
            temperament: temperament,
            foundationStock: foundationStock,
            founderEffect: founderEffect,
            genetic: genetic,
            blueHen: blueHen,
            crossFamily: crossFamily,
        },
        recommendation: recommendation,
    };
}
