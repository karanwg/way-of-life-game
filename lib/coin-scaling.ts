/**
 * Coin Scaling Utility
 * 
 * Provides shared logic for scaling coin amounts based on average player wealth.
 * Used by both the game engine (for actual effects) and the board UI (for display).
 * 
 * IMPORTANT: If you change the scaling formula here, both the engine and UI
 * will automatically use the updated formula.
 */

/** Base reference for coin scaling (early game baseline) */
export const COIN_SCALING_BASE_REFERENCE = 500

/**
 * Calculate the scaling multiplier based on average coins
 * 
 * @param averageCoins - Average coins across all players
 * @returns Multiplier (minimum 1x, scales linearly with average wealth)
 */
export function getCoinScalingMultiplier(averageCoins: number): number {
  return Math.max(1, averageCoins / COIN_SCALING_BASE_REFERENCE)
}

/**
 * Calculate scaled coin amount based on average player wealth
 * 
 * Scaling formula:
 * - Base reference: 500 coins (early game baseline)
 * - Minimum multiplier: 1x (never reduces base amounts)
 * - At 1000 avg: 2x, at 2000 avg: 4x, at 3000 avg: 6x
 * 
 * @param baseAmount - The base coin amount defined in the tile
 * @param averageCoins - Average coins across all players
 * @returns Scaled coin amount (rounded to nearest integer)
 */
export function getScaledCoinAmount(baseAmount: number, averageCoins: number): number {
  const multiplier = getCoinScalingMultiplier(averageCoins)
  return Math.round(baseAmount * multiplier)
}

/**
 * Calculate average coins from a list of players
 * 
 * @param players - Array of players with coins property
 * @returns Average coins (0 if no players)
 */
export function calculateAverageCoins(players: { coins: number }[]): number {
  if (players.length === 0) return 0
  return players.reduce((sum, p) => sum + p.coins, 0) / players.length
}
