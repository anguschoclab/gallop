"use strict";
/**
 * state/systemsState.ts - Systems state management
 *
 * This file provides systems state for optional subsystems and advanced features,
 * including NPC stables, breeding programs, jockeys, awards, campaigns, leaderboards,
 * facilities, user settings, expenses, transactions, replays, reputation, transportation,
 * staff, and pending intents.
 *
 * Dependencies: ../types (Stable, ScoutReport, Jockey, HorseCampaign, TripleCrownProgress, PlayerProfile), @/core/breeding/programs (BreedingProgram), ../awards/types (RegionalAward, AwardRegion), @/core/breeding/leaderboardTypes (Leaderboard, SireTrendData), @/core/resolver/intents (AnyIntent), @/core/facilities (FacilityType, FacilityLevel, PlayerFacilities), @/core/settings/settingsTypes (UserSettings), @/core/expenses (Expense), @/core/transactions (Transaction), @/core/replays (RaceReplay), @/core/reputation (ManagerReputation), @/core/transportation (TransportRequest), @/core/ai/npcCycleAI (NpcAIManager), @/core/staff/staffTypes (StaffMember), @/core/facilities/facilityDefaults (createFacility, createDefaultPlayerFacilities), @/core/settings/settingsTypes (createDefaultUserSettings), @/core/reputation (getReputationTier), ./index (NewGameOptions)
 * Related files: store.ts (uses systems state), npcStables.ts (NPC stable logic)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultSystemsState = createDefaultSystemsState;
var facilityDefaults_1 = require("@/core/facilities/facilityDefaults");
var settingsTypes_1 = require("@/core/settings/settingsTypes");
var reputation_1 = require("@/core/reputation");
/**
 * Create default systems state for new games.
 *
 * When options are provided, uses the backstory to customize facilities and reputation.
 * Otherwise uses default facilities and zero reputation.
 *
 * @param options - Optional new game options including profile and backstory
 * @returns Default systems state with NPC stables, facilities, reputation, and other subsystems initialized
 */
function createDefaultSystemsState(options) {
    if (options) {
        var profile = options.profile, backstory = options.backstory;
        // Build facilities from backstory spec (complete replace, not merge)
        var facilities = {};
        for (var _i = 0, _a = Object.entries(backstory.facilityUpgrades); _i < _a.length; _i++) {
            var _b = _a[_i], type = _b[0], level = _b[1];
            var facilityType = type;
            var facilityLevel = level;
            facilities[facilityType] = (0, facilityDefaults_1.createFacility)(facilityType, facilityLevel, 1);
        }
        return {
            npcStables: [],
            npcAIManager: {
                stableStates: {},
                globalDay: 1,
            },
            breedingPrograms: [],
            jockeys: [],
            awards: [],
            campaigns: [],
            triplecrownHistory: [],
            facilities: facilities,
            npcFacilities: {},
            userSettings: (0, settingsTypes_1.createDefaultUserSettings)(1),
            expenses: [],
            transactions: [],
            replays: [],
            reputation: {
                score: backstory.reputationScore,
                tier: (0, reputation_1.getReputationTier)(backstory.reputationScore),
                events: [],
                gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
                totalWins: 0,
                yearsActive: 0,
            },
            transports: [],
            playerProfile: profile,
            hallOfFame: [],
            trackRecords: {},
            horseLeaderboards: {},
            founders: {},
            syndicates: {},
            shareTransactions: [],
            usedHorseNames: [],
            usedJockeyNames: [],
            staffPool: [],
            hiredStaff: [],
        };
    }
    // Default behavior when no options provided (backward compatibility)
    return {
        npcStables: [],
        npcAIManager: {
            stableStates: {},
            globalDay: 1,
        },
        breedingPrograms: [],
        jockeys: [],
        awards: [],
        campaigns: [],
        triplecrownHistory: [],
        facilities: (0, facilityDefaults_1.createDefaultPlayerFacilities)(1),
        npcFacilities: {},
        userSettings: (0, settingsTypes_1.createDefaultUserSettings)(1),
        expenses: [],
        transactions: [],
        replays: [],
        reputation: {
            score: 0,
            tier: "unknown",
            events: [],
            gradedWins: { G1: 0, G2: 0, G3: 0, Listed: 0 },
            totalWins: 0,
            yearsActive: 0,
        },
        transports: [],
        hallOfFame: [],
        trackRecords: {},
        horseLeaderboards: {},
        founders: {},
        syndicates: {},
        shareTransactions: [],
        usedHorseNames: [],
        usedJockeyNames: [],
        staffPool: [],
        hiredStaff: [],
    };
}
