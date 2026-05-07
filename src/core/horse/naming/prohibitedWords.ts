/**
 * Prohibited and offensive word lists for horse naming validation.
 * Based on Jockey Club guidelines and general offensive word filters.
 */

export const OFFENSIVE_WORDS = [
  "offensive", // Placeholder for actual offensive words
  "profanity",
  // In a real app, this would be a comprehensive list or use a library
];

export const TRADE_NAMES = [
  "Nike", "Adidas", "Coca-Cola", "Pepsi", "Google", "Apple", "Microsoft",
  "Amazon", "Facebook", "Twitter", "Instagram", "TikTok", "Netflix",
  "Toyota", "Ford", "Ferrari", "Mercedes", "BMW", "Rolex",
];

export const RESERVED_NAMES = [
  "Unnamed", "Anonymous", "System", "Admin", "N/A", "TBD",
  "Secretariat", "Man o' War", "Citation", "Seattle Slew", "Affirmed", // Hall of Fame icons
];

export const PROHIBITED_PATTERNS = [
  /\b\d+\b/, // No standalone numbers
  /[!@#$%^&*()_=+\[\]{};':"\\|,.<>\/?]/, // No special characters except hyphens and apostrophes
];
