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
  // Offensive terms
  "shit",
  "fuck",
  "damn",
  "ass",
  "bitch",
  "bastard",
  // Slurs
  "nigger",
  "chink",
  "spic",
  "kike",
  "faggot",
  "dyke",
  // Drug references
  "heroin",
  "cocaine",
  "meth",
  "crack",
  "weed",
  "marijuana",
  // Violence
  "kill",
  "murder",
  "rape",
  "torture",
  // Sexual content
  "porn",
  "sex",
  "nude",
  "naked",
  // Hate symbols
  "swastika",
  "kkk",
  "nazi",
  // Political/religious sensitivity
  "hitler",
  "satan",
  "antichrist",
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
  /[\^]/, // Caret
  /[&]/, // Ampersand
  /[*]/, // Asterisk
  /[()]/, // Parentheses
  /[_]/, // Underscore
  /[+]/, // Plus sign
  /[\[\]]/, // Square brackets
  /[{}]/, // Curly brackets
  /[;:]/, // Semicolon and colon
  /["\\]/, // Quote and backslash
  /[|]/, // Pipe
  /[,.]/, // Comma and period
  /[<>]/, // Angle brackets
  /[\/?]/, // Forward slash and question mark
];
