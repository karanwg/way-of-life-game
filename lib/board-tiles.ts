export type TileEffect =
  | "none"
  | "coins"
  | "heist_10"
  | "heist_100"
  | "heist_50"
  | "ponzi"
  | "police_station"
  | "chance"
  | "community"
  // New chaotic events!
  | "robin_hood"      // Steal from richest, give to poorest
  | "tax_collector"   // Take 25 from EVERY other player
  | "party_time"      // Everyone gets 50 coins
  | "swap_meet"       // Swap coins with random player
  | "banana_peel"     // Push random player back 3 spaces
  | "coin_magnet"     // Steal 20 from each player
  | "money_bomb"      // Everyone else loses 50 coins

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
// Corners are at positions: 0 (GO), 6 (Jail/Visiting), 12 (Free Parking), 18 (Police)
// Bottom row (0-5): GO at corner, then 5 properties going right
// Right column (6-11): Jail at corner, then 5 properties going up
// Top row (12-17): Free Parking at corner, then 5 properties going left
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
    name: "Coin Magnet",
    effect: "coin_magnet",
    coins: 0,
    text: "🧲 Magnetic personality! Steal 20 coins from EACH player!",
    colorGroup: "brown",
    emoji: "🧲",
  },
  {
    id: 2,
    name: "Party Time!",
    effect: "party_time",
    coins: 0,
    text: "🎉 PARTY! Everyone gets 50 coins!",
    colorGroup: "community",
    emoji: "🎉",
  },
  {
    id: 3,
    name: "Thrift Store",
    effect: "coins",
    coins: -30,
    text: "Couldn't resist a deal. -30 coins",
    colorGroup: "brown",
    emoji: "👕",
  },
  {
    id: 4,
    name: "Tax Collector",
    effect: "tax_collector",
    coins: 0,
    text: "💸 You're the tax man! Take 25 coins from EVERYONE!",
    colorGroup: "tax",
    emoji: "💸",
  },
  {
    id: 5,
    name: "Train Station",
    effect: "coins",
    coins: 50,
    text: "Smooth travels! +50 coins",
    colorGroup: "railroad",
    emoji: "🚂",
  },

  // === RIGHT COLUMN (tiles 6-11) ===
  {
    id: 6,
    name: "Just Visiting",
    effect: "none",
    coins: 0,
    text: "Just visiting. Enjoy the view!",
    colorGroup: "corner",
    emoji: "👀",
  },
  {
    id: 7,
    name: "Banana Peel",
    effect: "banana_peel",
    coins: 0,
    text: "🍌 SLIP! Push a random player back 3 spaces!",
    colorGroup: "lightBlue",
    emoji: "🍌",
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
    name: "Chance",
    effect: "ponzi",
    coins: 0,
    text: "75% double, 25% lose half!",
    colorGroup: "chance",
    emoji: "❓",
  },
  {
    id: 10,
    name: "Bakery",
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
    name: "Free Parking",
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
    name: "Money Bomb",
    effect: "money_bomb",
    coins: 0,
    text: "💣 BOOM! Everyone else loses 50 coins!",
    colorGroup: "pink",
    emoji: "💣",
  },
  {
    id: 16,
    name: "Bus Stop",
    effect: "coins",
    coins: 40,
    text: "Found coins under the seat! +40 coins",
    colorGroup: "railroad",
    emoji: "🚌",
  },
  {
    id: 17,
    name: "Casino",
    effect: "ponzi",
    coins: 0,
    text: "75% double, 25% lose half!",
    colorGroup: "orange",
    emoji: "🎰",
  },

  // === LEFT COLUMN (tiles 18-23) ===
  {
    id: 18,
    name: "Police Station",
    effect: "police_station",
    coins: 0,
    text: "🚔 Snitch! Someone loses 300 coins!",
    colorGroup: "corner",
    emoji: "🚔",
  },
  {
    id: 19,
    name: "Ice Cream Truck",
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
    name: "Chance",
    effect: "ponzi",
    coins: 0,
    text: "75% double, 25% lose half!",
    colorGroup: "chance",
    emoji: "❓",
  },
  {
    id: 22,
    name: "Luxury Tax",
    effect: "coins",
    coins: -75,
    text: "Living large costs! -75 coins",
    colorGroup: "tax",
    emoji: "💎",
  },
  {
    id: 23,
    name: "Lemonade Stand",
    effect: "coins",
    coins: 60,
    text: "Refreshing sales! +60 coins",
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
