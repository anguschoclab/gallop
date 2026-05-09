"use strict";
/**
 * Prohibited and offensive word lists for horse naming validation.
 * Based on Jockey Club guidelines and general offensive word filters.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROHIBITED_PATTERNS = exports.RESERVED_NAMES = exports.TRADE_NAMES = exports.OFFENSIVE_WORDS = void 0;
exports.OFFENSIVE_WORDS = [
    "offensive", // Placeholder for actual offensive words
    "profanity",
    // In a real app, this would be a comprehensive list or use a library
];
exports.TRADE_NAMES = [
    "Nike",
    "Adidas",
    "Coca-Cola",
    "Pepsi",
    "Google",
    "Apple",
    "Microsoft",
    "Amazon",
    "Facebook",
    "Twitter",
    "Instagram",
    "TikTok",
    "Netflix",
    "Toyota",
    "Ford",
    "Ferrari",
    "Mercedes",
    "BMW",
    "Rolex",
];
exports.RESERVED_NAMES = ["Unnamed", "Anonymous", "System", "Admin", "N/A", "TBD"];
exports.PROHIBITED_PATTERNS = [
    /\b\d+\b/, // No standalone numbers
    /[!@#$%^&*()_=+[\]{};:"\\|,.<>/?]/, // Removed ' and - is already allowed by exclusion
];
