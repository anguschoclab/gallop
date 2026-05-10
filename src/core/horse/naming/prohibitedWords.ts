/**
 * prohibitedWords.ts - Prohibited word lists for naming validation
 *
 * This file provides lists of offensive words, trade names, reserved names, and
 * prohibited patterns for horse naming validation based on Jockey Club guidelines.
 *
 * Dependencies: None (self-contained data)
 * Related files: jockeyClubRules.ts (uses these lists for validation)
 */

/**
 * Prohibited and offensive word lists for horse naming validation.
 * Based on Jockey Club guidelines and general offensive word filters.
 */

export const OFFENSIVE_WORDS = [
  // Common profanity (mild to moderate)
  "damn",
  "hell",
  "ass",
  "bastard",
  "bitch",
  "shit",
  "crap",
  "piss",
  "offensive",
  // Slurs and hate speech (blocked)
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "retarded",
  // Sexual content (blocked)
  "fuck",
  "sex",
  "porn",
  // Violence and hate (blocked)
  "kill",
  "murder",
  "death",
  "die",
  // Drugs (blocked)
  "drug",
  "cocaine",
  "heroin",
  "meth",
  // Additional filters can be added as needed
  // This list is intentionally conservative for a general audience
];

export const TRADE_NAMES = [
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

export const RESERVED_NAMES = ["Unnamed", "Anonymous", "System", "Admin", "N/A", "TBD"];

export const PROHIBITED_PATTERNS = [
  /\b\d+\b/, // No standalone numbers
  /[!]/, // Exclamation mark
  /[@]/, // At sign
  /[#]/, // Hash
  /[$]/, // Dollar sign
  /[%]/, // Percent sign
  /[\/]/, // Forward slash
  /[?]/, // Question mark
];
