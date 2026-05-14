"use strict";
/**
 * store/slices/settingsSlice.ts - User settings slice
 *
 * This file provides user settings management for display, gameplay, notifications,
 * and audio preferences.
 *
 * Dependencies: @/core/settings/settingsTypes (UserSettings, createDefaultUserSettings), ../types (GameStateCreator)
 * Related files: store/index.ts (uses this slice), @/core/settings/settingsTypes.ts (settings types)
 */
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
exports.createSettingsSlice = void 0;
var settingsTypes_1 = require("@/core/settings/settingsTypes");
var createSettingsSlice = function (set, get) { return ({
    updateUserSettings: function (settings) {
        set(function (state) { return ({
            userSettings: __assign(__assign({}, state.userSettings), settings),
        }); });
    },
    updateDisplaySettings: function (settings) {
        set(function (state) {
            var _a;
            return ({
                userSettings: __assign(__assign({}, state.userSettings), { display: __assign(__assign({}, (_a = state.userSettings) === null || _a === void 0 ? void 0 : _a.display), settings) }),
            });
        });
    },
    updateGameplaySettings: function (settings) {
        set(function (state) {
            var _a;
            return ({
                userSettings: __assign(__assign({}, state.userSettings), { gameplay: __assign(__assign({}, (_a = state.userSettings) === null || _a === void 0 ? void 0 : _a.gameplay), settings) }),
            });
        });
    },
    updateNotificationSettings: function (settings) {
        set(function (state) {
            var _a;
            return ({
                userSettings: __assign(__assign({}, state.userSettings), { notifications: __assign(__assign({}, (_a = state.userSettings) === null || _a === void 0 ? void 0 : _a.notifications), settings) }),
            });
        });
    },
    updateAudioSettings: function (settings) {
        set(function (state) {
            var _a;
            return ({
                userSettings: __assign(__assign({}, state.userSettings), { audio: __assign(__assign({}, (_a = state.userSettings) === null || _a === void 0 ? void 0 : _a.audio), settings) }),
            });
        });
    },
    resetSettings: function () {
        set(function (state) { return ({
            userSettings: (0, settingsTypes_1.createDefaultUserSettings)(state.day),
        }); });
    },
    setUserSettings: function (settings) {
        set({ userSettings: settings });
    },
}); };
exports.createSettingsSlice = createSettingsSlice;
