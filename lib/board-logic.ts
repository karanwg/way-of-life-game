import { TILES } from "./board-tiles"

/**
 * Roll a die with given max value
 * @param maxValue - Maximum value (default 4 for d4)
 * @returns Random number from 1 to maxValue
 */
export function rollDie(maxValue = 4): number {
  return Math.floor(Math.random() * maxValue) + 1
}

/**
 * Move player forward on the board
 * @param currentTileId - Current tile ID
 * @param steps - Number of steps to move
 * @returns New tile ID after movement
 */
export function movePlayerForward(currentTileId: number, steps: number): number {
  return (currentTileId + steps) % TILES.length
}

/**
 * Check if player passed Spawn (tile 0) during movement
 * @param previousTileId - Tile ID before movement
 * @param newTileId - Tile ID after movement
 * @returns True if player crossed Spawn
 */
export function didPassSpawn(previousTileId: number, newTileId: number): boolean {
  // Passed spawn if new tile is less than previous (wrapped around)
  // but not if starting from spawn itself
  return newTileId < previousTileId && previousTileId !== 0
}

/**
 * Roll for marriage event (20% chance)
 * @returns True if marriage should occur
 */
export function rollMarriageChance(): boolean {
  return Math.random() < 0.2
}

/**
 * Roll for Ponzi scheme outcome (50/50)
 * @returns True if player wins (gains 50%), false if loses (loses 50%)
 */
export function rollPonziOutcome(): boolean {
  return Math.random() < 0.5
}
