/**
 * odds/index.ts - Odds module
 *
 * This module provides pari-mutuel betting odds simulation.
 *
 * Dependencies: ./oddsTypes (types and functions)
 * Related files: oddsTypes.ts (provides types and functions)
 */

// Odds Module - Pari-mutuel betting odds simulation

export type { OddsResult, BettingPool } from "./oddsTypes";

export {
  calculateWinProbability,
  probabilityToMorningLine,
  formatOdds,
  createBettingPool,
  updateOdds,
} from "./oddsTypes";
