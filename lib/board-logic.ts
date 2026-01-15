/**
 * Board Logic - Core game mechanics for board movement
 * 
 * This module contains pure functions for:
 * - Dice rolling
 * - Player movement calculation
 * - Lap detection (passing GO)
 * - Random event chance calculations
 */

import { TILES } from "./board-tiles"

/**
 * Roll a die with the specified maximum value
 * 
 * @param maxValue - Maximum die value (default: 6 for d6)
 * @returns Random number from 1 to maxValue
 */
export function rollDie(maxValue = 6): number {
  return Math.floor(Math.random() * maxValue) + 1
}

/**
 * Calculate new tile position after moving forward
 * Handles wrap-around when passing the end of the board
 * 
 * @param currentTileId - Current tile ID (0 to TILES.length-1)
 * @param steps - Number of steps to move forward
 * @returns New tile ID after movement
 */
export function movePlayerForward(currentTileId: number, steps: number): number {
  return (currentTileId + steps) % TILES.length
}

/**
 * Check if player passed GO (tile 0) during movement
 * 
 * This is detected by checking if the new tile ID is less than the previous,
 * which indicates the player wrapped around the board.
 * 
 * Special case: Starting from GO itself doesn't count as passing it.
 * 
 * @param previousTileId - Tile ID before movement
 * @param newTileId - Tile ID after movement
 * @returns True if player crossed GO
 */
export function didPassHome(previousTileId: number, newTileId: number): boolean {
  // Wrapped around if new < previous (but not if starting from GO)
  return newTileId < previousTileId && previousTileId !== 0
}

/**
 * Roll for identity theft event
 * 
 * Identity theft occurs when two players are on the same tile
 * and there's a 25% chance of their coins being swapped.
 * 
 * @returns True if identity theft should occur (25% chance)
 */
export function rollIdentityTheftChance(): boolean {
  return Math.random() < 0.25
}

/**
 * Roll for Ponzi scheme outcome
 * 
 * When a player gambles on a Ponzi/Chance tile:
 * - 75% chance: Win (double coins)
 * - 25% chance: Lose (lose half coins)
 * 
 * @returns True if player wins (75% chance)
 */
export function rollPonziOutcome(): boolean {
  return Math.random() < 0.75
}
