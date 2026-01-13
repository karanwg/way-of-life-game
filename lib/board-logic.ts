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
 * Check if player passed Home (tile 0) during movement
 * @param previousTileId - Tile ID before movement
 * @param newTileId - Tile ID after movement
 * @returns True if player crossed Home
 */
export function didPassHome(previousTileId: number, newTileId: number): boolean {
  // Passed home if new tile is less than previous (wrapped around)
  // but not if starting from home itself
  return newTileId < previousTileId && previousTileId !== 0
}

/**
 * Roll for identity theft event (25% chance)
 * @returns True if identity theft should occur
 */
export function rollIdentityTheftChance(): boolean {
  return Math.random() < 0.25
}

/**
 * Roll for Ponzi scheme outcome (75% win, 25% lose)
 * @returns True if player wins (doubles coins), false if loses (loses half)
 */
export function rollPonziOutcome(): boolean {
  return Math.random() < 0.75
}
