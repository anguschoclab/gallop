/**
 * gameConstants.ts - Centralized game constants
 *
 * This file provides a single source of truth for all game balance constants
 * including prize splits, upkeep costs, training costs, starting cash, and calendar constants.
 *
 * Dependencies: None (self-contained constants)
 * Related files: Used throughout the game for balance calculations
 */

/**
 * Centralized game constants
 * Single source of truth for all game balance constants
 */

/**
 * Prize money distribution for race finishers
 * Index 0 = 1st place (60%), 1 = 2nd place (25%), 2 = 3rd place (10%), 3 = 4th place (5%)
 */
export const PRIZE_SPLIT = [0.6, 0.25, 0.1, 0.05];

/**
 * Daily upkeep cost per horse
 */
export const UPKEEP_PER_HORSE = 50;

/**
 * Cost per training session
 */
export const TRAINING_COST = 75;

/**
 * Starting cash for new games (default, can be overridden by backstory)
 */
export const STARTING_CASH = 5000;

/**
 * Base breeding fee
 */
export const BREEDING_FEE = 2000;

/**
 * Game calendar constants
 */
export const DAYS_PER_YEAR = 365;
export const DAYS_PER_MONTH = 30;
export const DAYS_PER_WEEK = 7;

/**
 * Additional fee for live foal guarantee
 */
export const LIVE_FOAL_GUARANTEE_FEE = 1000;

/**
 * Gestation period in days
 */
export const GESTATION_DAYS = 30;

/**
 * Number of days in a season (for recalibration intervals)
 */
export const SEASON_DAYS = 30;

/**
 * Maximum number of Beyer samples per bucket for par calculation
 */
export const MAX_SAMPLES_PER_BUCKET = 60;
