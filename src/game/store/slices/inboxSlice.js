"use strict";
/**
 * store/slices/inboxSlice.ts - Inbox state slice
 *
 * This file provides UI-driven inbox actions, including marking messages as read,
 * dismissing notifications, and pinning important messages.
 *
 * Dependencies: ../types (GameStateCreator, StoreGet)
 * Related files: src/core/inbox/inboxTypes.ts (data model)
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
exports.createInboxSlice = void 0;
/**
 * Create the inbox state slice with read/write actions for the player's inbox.
 */
var createInboxSlice = function (set, get) { return ({
    markMessageRead: function (id) {
        var _a = get(), inbox = _a.inbox, day = _a.day;
        set({
            inbox: inbox.map(function (m) { return (m.id === id ? __assign(__assign({}, m), { readAt: day }) : m); }),
        });
    },
    markAllMessagesRead: function () {
        var _a = get(), inbox = _a.inbox, day = _a.day;
        set({
            inbox: inbox.map(function (m) { return (m.readAt ? m : __assign(__assign({}, m), { readAt: day })); }),
        });
    },
    dismissMessage: function (id) {
        var inbox = get().inbox;
        set({
            inbox: inbox.filter(function (m) { return m.id !== id; }),
        });
    },
    pinMessageUntil: function (id, untilDay) {
        var inbox = get().inbox;
        set({
            inbox: inbox.map(function (m) { return (m.id === id ? __assign(__assign({}, m), { pinnedUntil: untilDay }) : m); }),
        });
    },
}); };
exports.createInboxSlice = createInboxSlice;
