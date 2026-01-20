/**
 * Board Tiles - Tile definitions and layout configuration
 * 
 * This module defines:
 * - All 24 tiles on the game board
 * - Tile effects and their mechanics
 * - Color styling for tile groups
 * - Layout constants for board rendering
 * 
 * BOARD LAYOUT:
 * The board is a square with 6 tiles per side (24 total).
 * Players move clockwise starting from GO (tile 0).
 * 
 * TILE TYPES:
 * - Corner tiles (0, 6, 12, 18): Special tiles like GO, Penalty Pick
 * - Regular tiles: Properties, events, chances
 * 
 * EFFECTS:
 * - coins: Coin gain/loss (SCALES with average player wealth - see p2p-game-engine.ts)
 * - heist_*: Steal from another player (interactive)
 * - ponzi: Gamble for double or lose half (interactive)
 * - police_station: Report someone for -300 coins (interactive)
 * - Global events: Affect multiple players
 * 
 * DYNAMIC SCALING:
 * Coin gain/loss tiles (effect="coins") scale based on the average coins of all players.
 * Base amounts are defined here, but actual amounts are calculated at runtime.
 * GO (tile 0) is exempt from scaling and always awards a fixed amount.
 */

/**
 * Tile Effect Types
 * 
 * none: No effect (just visiting)
 * coins: Gain or lose coins (base amount in tile.coins, scales with average wealth)
 * heist_*: Interactive theft (player selects target)
 * ponzi: Interactive gamble (75% win, 25% lose)
 * police_station: Interactive report (target loses 300)
 * Global events affect multiple players automatically
 */
export type TileEffect =
  | "none"           // No effect
  | "coins"          // Gain/lose coins (amount in tile.coins)
  | "heist_10"       // Steal 10% from target
  | "heist_100"      // Steal up to 100 from target
  | "heist_50"       // Steal 50% from target
  | "ponzi"          // Gamble: 75% double, 25% lose half
  | "police_station" // Report someone for -300 coins
  | "chance"         // (unused - kept for compatibility)
  | "community"      // (unused - kept for compatibility)
  | "robin_hood"     // Take from richest, give to poorest
  | "tax_collector"  // Take 25 from EVERY other player
  | "party_time"     // Everyone gets 50 coins
  | "swap_meet"      // Swap ALL coins with random player
  | "banana_peel"    // Push random player back 3 spaces
  | "coin_magnet"    // Steal 20 from EACH player
  | "money_bomb"     // Everyone else loses 50 coins

// Monopoly-style color groups
export type ColorGroup = 
  | "corner"      // Special corners - cream/gold
  | "brown"       // Mediterranean/Baltic
  | "lightBlue"   // Oriental/Vermont/Connecticut
  | "pink"        // St. Charles/States/Virginia
  | "orange"      // St. James/Tennessee/New York
  | "red"         // Kentucky/Indiana/Illinois
  | "yellow"      // Atlantic/Ventnor/Marvin
  | "green"       // Pacific/North Carolina/Pennsylvania
  | "darkBlue"    // Park Place/Boardwalk
  | "railroad"    // Railroads
  | "utility"     // Utilities
  | "tax"         // Tax spaces
  | "chance"      // Chance
  | "community"   // Community Chest

export interface Tile {
  id: number
  name: string
  effect: TileEffect
  coins?: number
  text: string
  colorGroup: ColorGroup
  emoji: string
}

// 24 tiles - 6 per side, Monopoly-style layout
// Corners are at positions: 0 (GO), 6 (Jail/Visiting), 12 (Free Bonus), 18 (Police)
// Bottom row (0-5): GO at corner, then 5 properties going right
// Right column (6-11): Jail at corner, then 5 properties going up
// Top row (12-17): Free Bonus at corner, then 5 properties going left
// Left column (18-23): Police at corner, then 5 properties going down

export const TILES: Tile[] = [
  // === BOTTOM ROW (tiles 0-5) ===
  {
    id: 0,
    name: "GO",
    effect: "coins",
    coins: 200,
    text: "Collect $200 as you pass GO!",
    colorGroup: "corner",
    emoji: "➡️",
  },
  {
    id: 1,
    name: "Class Tax",
    effect: "coin_magnet",
    coins: 0,
    text: "🧲 Magnetic personality! Steal 20 coins from EACH player!",
    colorGroup: "brown",
    emoji: "🧲",
  },
  {
    id: 2,
    name: "Class Bonus",
    effect: "party_time",
    coins: 0,
    text: "🎉 PARTY! Everyone gets 50 coins!",
    colorGroup: "community",
    emoji: "🎉",
  },
  {
    id: 3,
    name: "Small Expense",
    effect: "coins",
    coins: -30,
    text: "Couldn't resist a deal. -30 coins",
    colorGroup: "brown",
    emoji: "👕",
  },
  {
    id: 4,
    name: "Class Tax",
    effect: "tax_collector",
    coins: 0,
    text: "💸 You're the tax man! Take 25 coins from EVERYONE!",
    colorGroup: "tax",
    emoji: "💸",
  },
  {
    id: 5,
    name: "Quick Cash",
    effect: "coins",
    coins: 50,
    text: "Smooth travels! +50 coins",
    colorGroup: "railroad",
    emoji: "🚂",
  },

  // === RIGHT COLUMN (tiles 6-11) ===
  {
    id: 6,
    name: "No Effect",
    effect: "none",
    coins: 0,
    text: "Just visiting. Enjoy the view!",
    colorGroup: "corner",
    emoji: "👀",
  },
  {
    id: 7,
    name: "Big Expense",
    effect: "coins",
    coins: -200,
    text: "Living large costs!",
    colorGroup: "tax",
    emoji: "💎",
  },
  {
    id: 8,
    name: "Pickpocket",
    effect: "heist_10",
    coins: 0,
    text: "Sneak up and skim 10% off someone!",
    colorGroup: "lightBlue",
    emoji: "🤏",
  },
  {
    id: 9,
    name: "Fortune Wheel",
    effect: "ponzi",
    coins: 0,
    text: "75% double, 25% lose half!",
    colorGroup: "chance",
    emoji: "❓",
  },
  {
    id: 10,
    name: "Quick Cash",
    effect: "coins",
    coins: 80,
    text: "Sweet profits! +80 coins",
    colorGroup: "lightBlue",
    emoji: "🥐",
  },
  {
    id: 11,
    name: "Swap Meet",
    effect: "swap_meet",
    coins: 0,
    text: "🔄 SWAP! Trade ALL your coins with a random player!",
    colorGroup: "pink",
    emoji: "🔄",
  },

  // === TOP ROW (tiles 12-17) ===
  {
    id: 12,
    name: "Free Bonus",
    effect: "coins",
    coins: 100,
    text: "Lucky! Free money! +100 coins",
    colorGroup: "corner",
    emoji: "🅿️",
  },
  {
    id: 13,
    name: "Quick Heist",
    effect: "heist_100",
    coins: 0,
    text: "Grab 100 coins from someone!",
    colorGroup: "pink",
    emoji: "🎭",
  },
  {
    id: 14,
    name: "Robin Hood",
    effect: "robin_hood",
    coins: 0,
    text: "🦸 Steal 150 from the RICHEST, give 150 to the POOREST!",
    colorGroup: "community",
    emoji: "🦸",
  },
  {
    id: 15,
    name: "Everyone Pays",
    effect: "money_bomb",
    coins: 0,
    text: "💣 BOOM! Everyone else loses 50 coins!",
    colorGroup: "pink",
    emoji: "💣",
  },
  {
    id: 16,
    name: "Fortune Wheel",
    effect: "ponzi",
    coins: 0,
    text: "75% double, 25% lose half!",
    colorGroup: "chance",
    emoji: "🎲",
  },
  {
    id: 17,
    name: "Fortune Wheel",
    effect: "ponzi",
    coins: 0,
    text: "75% double, 25% lose half!",
    colorGroup: "orange",
    emoji: "🎰",
  },

  // === LEFT COLUMN (tiles 18-23) ===
  {
    id: 18,
    name: "Penalty Pick",
    effect: "police_station",
    coins: 0,
    text: "🚔 Snitch! Someone loses 300 coins!",
    colorGroup: "corner",
    emoji: "🚔",
  },
  {
    id: 19,
    name: "Quick Cash",
    effect: "coins",
    coins: 90,
    text: "Cool profits! +90 coins",
    colorGroup: "red",
    emoji: "🍦",
  },
  {
    id: 20,
    name: "Grand Heist",
    effect: "heist_50",
    coins: 0,
    text: "Steal 50% of someone's fortune!",
    colorGroup: "red",
    emoji: "💎",
  },
  {
    id: 21,
    name: "Fortune Wheel",
    effect: "ponzi",
    coins: 0,
    text: "75% double, 25% lose half!",
    colorGroup: "chance",
    emoji: "❓",
  },
  {
    id: 22,
    name: "Big Expense",
    effect: "coins",
    coins: -200,
    text: "Living large costs!",
    colorGroup: "tax",
    emoji: "💎",
  },
  {
    id: 23,
    name: "Quick Cash",
    effect: "coins",
    coins: 60,
    text: "Refreshing sales, sweet profits!",
    colorGroup: "yellow",
    emoji: "🍋",
  },
]

// Get color classes for each color group (Monopoly-style)
export function getTileColors(colorGroup: ColorGroup): { bg: string; border: string; text: string } {
  switch (colorGroup) {
    case "corner":
      return { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-900" }
    case "brown":
      return { bg: "bg-amber-700", border: "border-amber-800", text: "text-white" }
    case "lightBlue":
      return { bg: "bg-sky-300", border: "border-sky-400", text: "text-sky-900" }
    case "pink":
      return { bg: "bg-pink-400", border: "border-pink-500", text: "text-pink-900" }
    case "orange":
      return { bg: "bg-orange-400", border: "border-orange-500", text: "text-orange-900" }
    case "red":
      return { bg: "bg-red-500", border: "border-red-600", text: "text-white" }
    case "yellow":
      return { bg: "bg-yellow-300", border: "border-yellow-400", text: "text-yellow-900" }
    case "green":
      return { bg: "bg-emerald-500", border: "border-emerald-600", text: "text-white" }
    case "darkBlue":
      return { bg: "bg-blue-700", border: "border-blue-800", text: "text-white" }
    case "railroad":
      return { bg: "bg-gray-800", border: "border-gray-900", text: "text-white" }
    case "utility":
      return { bg: "bg-slate-400", border: "border-slate-500", text: "text-slate-900" }
    case "tax":
      return { bg: "bg-gray-600", border: "border-gray-700", text: "text-white" }
    case "chance":
      return { bg: "bg-orange-300", border: "border-orange-400", text: "text-orange-900" }
    case "community":
      return { bg: "bg-sky-200", border: "border-sky-300", text: "text-sky-900" }
    default:
      return { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-800" }
  }
}

export function getTileByName(name: string): Tile | undefined {
  return TILES.find((tile) => tile.name === name)
}

export function getTileById(id: number): Tile | undefined {
  return TILES.find((tile) => tile.id === id)
}

// Board layout constants
export const TILES_PER_SIDE = 6
export const TOTAL_TILES = 24

// Corner tile IDs
export const CORNER_TILE_IDS = [0, 6, 12, 18]
