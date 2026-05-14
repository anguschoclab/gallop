"use strict";
/**
 * handlers/HorseHandler.ts - Horse impact handler
 *
 * This file handles horse-related impacts including stat changes, energy changes,
 * form changes, fame changes, gelding, renaming, aging, health status changes,
 * pasture retirement, horse death, injury, and horse creation.
 *
 * Dependencies: immer (WritableDraft), @/game/types (GameState), ../impacts (AnyImpact), @/core/horse/gender (isMaleHorse), ./types (ImpactHandler)
 * Related files: ../resolver.ts (uses handler), ../impacts/horseImpacts.ts (provides impact types)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HorseHandler = void 0;
var gender_1 = require("@/core/horse/gender");
var uuid_1 = require("@/core/uuid");
var IMPACT_HANDLERS = {
    horse_creation: function (draft, impact, horse, lookupMaps) {
        var impactAny = impact;
        var horseData = impactAny.horse;
        if (horseData) {
            draft.horses.push(horseData);
            if (lookupMaps)
                lookupMaps.horseMap.set(horseData.id, horseData);
        }
    },
    horse_stat_change: function (draft, impact, horse) {
        var impactAny = impact;
        var stat = impactAny.stat, delta = impactAny.delta;
        if (horse) {
            horse.stats[stat] = Math.min(horse.potential, Math.max(0, horse.stats[stat] + delta));
        }
    },
    energy_change: function (draft, impact, horse) {
        var impactAny = impact;
        var delta = impactAny.delta;
        if (horse) {
            horse.energy = Math.min(100, Math.max(0, horse.energy + delta));
        }
    },
    form_change: function (draft, impact, horse) {
        var impactAny = impact;
        var delta = impactAny.delta;
        if (horse) {
            horse.form = Math.min(10, Math.max(-10, horse.form + delta));
        }
    },
    fame_change: function (draft, impact, horse) {
        var impactAny = impact;
        var delta = impactAny.delta;
        if (horse) {
            horse.fame = Math.min(100, Math.max(0, horse.fame + delta));
        }
    },
    gelding: function (draft, impact, horse) {
        if (horse && (0, gender_1.isMaleHorse)(horse.gender)) {
            horse.gender = "gelding";
        }
    },
    rename: function (draft, impact, horse) {
        var impactAny = impact;
        var newName = impactAny.newName;
        if (horse) {
            horse.name = newName;
        }
    },
    aging: function (draft, impact, horse) {
        var impactAny = impact;
        var newAge = impactAny.newAge;
        if (horse) {
            horse.age = newAge;
        }
    },
    health_status_change: function (draft, impact, horse) {
        var impactAny = impact;
        var status = impactAny.status;
        if (horse) {
            horse.healthStatus = status;
            horse.healthStatusDay = impact.day;
        }
    },
    pasture_retirement: function (draft, impact, horse) {
        var impactAny = impact;
        var retiredOnDay = impactAny.retiredOnDay;
        if (horse) {
            horse.lifecycleStatus = "retired";
            horse.retiredOnDay = retiredOnDay;
        }
    },
    horse_death: function (draft, impact, horse) {
        var impactAny = impact;
        var cause = impactAny.cause, deceasedOnDay = impactAny.deceasedOnDay;
        if (horse) {
            horse.lifecycleStatus = "deceased";
            horse.deceasedOnDay = deceasedOnDay;
            horse.causeOfDeath = cause;
        }
    },
    injury: function (draft, impact, horse) {
        var impactAny = impact;
        var severity = impactAny.severity, injuryType = impactAny.injuryType, recoveryDays = impactAny.recoveryDays;
        if (horse) {
            horse.healthStatus = severity === "career-ending" ? "other_illness" : "recovering";
            horse.healthStatusDay = impact.day;
            horse.activeInjury = {
                type: injuryType,
                severity: severity,
                recoveryDays: recoveryDays,
                onsetDay: impact.day,
            };
            // Push to Inbox if player-owned
            if (!horse.stableId) {
                if (!draft.inbox)
                    draft.inbox = [];
                draft.inbox.push({
                    id: (0, uuid_1.generateUUID)(),
                    day: impact.day,
                    category: "injury",
                    priority: "urgent",
                    title: "Injury: ".concat(horse.name),
                    body: "".concat(horse.name, " sustained a ").concat(severity, " ").concat(injuryType, " injury. Estimated recovery: ").concat(recoveryDays, " days."),
                    cta: {
                        label: "View Horse",
                        route: "stable.$horseId",
                        params: { horseId: horse.id },
                    },
                });
            }
        }
    },
    recovery_change: function (draft, impact, horse) {
        var _a;
        var impactAny = impact;
        var delta = impactAny.delta;
        if (horse) {
            horse.recoveryPoints = Math.min(100, Math.max(0, ((_a = horse.recoveryPoints) !== null && _a !== void 0 ? _a : 100) + delta));
        }
    },
    fitness_change: function (draft, impact, horse) {
        var _a;
        var impactAny = impact;
        var delta = impactAny.delta;
        if (horse) {
            horse.fitness = Math.max(0, ((_a = horse.fitness) !== null && _a !== void 0 ? _a : 0) + delta);
        }
    },
    fatigue_change: function (draft, impact, horse) {
        var _a;
        var impactAny = impact;
        var delta = impactAny.delta;
        if (horse) {
            horse.fatigue = Math.max(0, ((_a = horse.fatigue) !== null && _a !== void 0 ? _a : 0) + delta);
        }
    },
    peaking_index_update: function (draft, impact, horse) {
        var impactAny = impact;
        var value = impactAny.value;
        if (horse) {
            horse.peakingIndex = value;
        }
    },
    beyer_update: function (draft, impact, horse) {
        var impactAny = impact;
        var beyer = impactAny.beyer, raceDay = impactAny.raceDay;
        if (horse) {
            horse.lastBeyer = beyer;
            horse.lastRaceDay = raceDay;
        }
    },
};
var HorseHandler = /** @class */ (function () {
    function HorseHandler() {
    }
    HorseHandler.prototype.canHandle = function (type) {
        return [
            "horse_stat_change",
            "energy_change",
            "form_change",
            "fame_change",
            "gelding",
            "rename",
            "aging",
            "health_status_change",
            "pasture_retirement",
            "horse_death",
            "injury",
            "horse_creation",
            "recovery_change",
            "fitness_change",
            "fatigue_change",
            "peaking_index_update",
            "beyer_update",
        ].includes(type);
    };
    HorseHandler.prototype.handle = function (draft, impact, lookupMaps) {
        var impactAny = impact;
        var horseId = impactAny.horseId || impactAny.entityId;
        var horse = (lookupMaps === null || lookupMaps === void 0 ? void 0 : lookupMaps.horseMap.get(horseId)) || draft.horses.find(function (h) { return h.id === horseId; });
        var handler = IMPACT_HANDLERS[impact.type];
        if (handler) {
            handler(draft, impact, horse, lookupMaps);
        }
    };
    return HorseHandler;
}());
exports.HorseHandler = HorseHandler;
