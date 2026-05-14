"use strict";
/**
 * resolver/handlers/InboxHandler.ts - Inbox impact handler
 *
 * This file provides the handler for processing inbox_message impacts
 * into the game state.
 *
 * Dependencies: ./types (ImpactHandler), @/core/uuid (generateUUID)
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
exports.InboxHandler = void 0;
var uuid_1 = require("@/core/uuid");
var InboxHandler = /** @class */ (function () {
    function InboxHandler() {
    }
    InboxHandler.prototype.canHandle = function (type) {
        return type === "inbox_message";
    };
    InboxHandler.prototype.handle = function (draft, impact, _lookupMaps) {
        var impactAny = impact;
        if (!draft.inbox)
            draft.inbox = [];
        // Push the message to the player's inbox
        draft.inbox.push(__assign(__assign({}, impactAny.message), { id: (0, uuid_1.generateUUID)(), day: impact.day }));
    };
    return InboxHandler;
}());
exports.InboxHandler = InboxHandler;
