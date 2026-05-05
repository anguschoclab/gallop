// Pari-Mutuel Odds Types - Simulate betting odds for atmosphere

/**
 * Odds calculation result
 */
export interface OddsResult {
  horseId: string;
  morningLine: number; // Odds like 5-1, 10-1, etc. (as number for calculation)
  currentOdds: number; // Real-time odds based on betting pool
  winProbability: number; // 0-1 probability of winning
  totalPool: number; // Total money bet on this horse
}

/**
 * Betting pool state
 */
export interface BettingPool {
  raceId: string;
  totalPool: number; // Total money in the win pool
  horseBets: Record<string, number>; // Money bet on each horse
  odds: OddsResult[];
}

/**
 * Calculate win probability from horse stats
 */
export function calculateWinProbability(
  speed: number,
  stamina: number,
  acceleration: number,
  form: number,
  classBonus: number = 0
): number {
  // Base probability from stats (normalized 0-1)
  const baseProb = (speed + stamina + acceleration) / 300;
  
  // Form adjustment (form is 0-100)
  const formAdjustment = form / 200;
  
  // Class bonus adjustment
  const classAdjustment = classBonus / 100;
  
  // Combine and normalize
  let probability = baseProb + formAdjustment + classAdjustment;
  probability = Math.max(0.05, Math.min(0.95, probability)); // Clamp between 5% and 95%
  
  return probability;
}

/**
 * Calculate morning line odds from probability
 */
export function probabilityToMorningLine(probability: number): number {
  if (probability >= 0.5) return 1; // 1-1 or less
  if (probability >= 0.33) return 2; // 2-1
  if (probability >= 0.25) return 3; // 3-1
  if (probability >= 0.2) return 4; // 4-1
  if (probability >= 0.17) return 5; // 5-1
  if (probability >= 0.14) return 6; // 6-1
  if (probability >= 0.12) return 8; // 8-1
  if (probability >= 0.1) return 10; // 10-1
  if (probability >= 0.08) return 12; // 12-1
  if (probability >= 0.06) return 15; // 15-1
  if (probability >= 0.05) return 20; // 20-1
  return 30; // 30-1 or higher
}

/**
 * Format odds for display (e.g., "5-1", "2-1", "1-1")
 */
export function formatOdds(odds: number): string {
  if (odds < 1) return "1-1";
  if (odds === 1) return "1-1";
  if (Number.isInteger(odds)) return `${odds}-1`;
  return `${odds.toFixed(1)}-1`;
}

/**
 * Create a betting pool for a race
 */
export function createBettingPool(
  raceId: string,
  horseProbabilities: Record<string, number>
): BettingPool {
  const horseBets: Record<string, number> = {};
  const odds: OddsResult[] = [];
  
  // Simulate initial bets based on probability
  const totalSimulatedPool = 10000; // $10,000 simulated pool
  
  for (const [horseId, probability] of Object.entries(horseProbabilities)) {
    const bet = totalSimulatedPool * probability;
    horseBets[horseId] = bet;
    
    odds.push({
      horseId,
      morningLine: probabilityToMorningLine(probability),
      currentOdds: probabilityToMorningLine(probability),
      winProbability: probability,
      totalPool: bet,
    });
  }
  
  return {
    raceId,
    totalPool: totalSimulatedPool,
    horseBets,
    odds,
  };
}

/**
 * Update odds based on betting activity (simulate betting flow)
 */
export function updateOdds(
  pool: BettingPool,
  horseId: string,
  betAmount: number
): BettingPool {
  const newPool = { ...pool };
  newPool.totalPool += betAmount;
  newPool.horseBets = { ...pool.horseBets };
  newPool.horseBets[horseId] = (pool.horseBets[horseId] ?? 0) + betAmount;
  
  // Recalculate current odds based on new pool distribution
  newPool.odds = pool.odds.map((oddsResult) => {
    const horseBet = newPool.horseBets[oddsResult.horseId] ?? 0;
    const share = horseBet / newPool.totalPool;
    const currentOdds = probabilityToMorningLine(share);
    
    return {
      ...oddsResult,
      currentOdds,
      totalPool: horseBet,
    };
  });
  
  return newPool;
}
