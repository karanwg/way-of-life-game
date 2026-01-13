export type TileEffect =
  | "none"
  | "coins"
  | "heist_light"
  | "heist_heavy"
  | "ponzi"
  | "jail"

export interface Tile {
  id: number
  name: string
  effect: TileEffect
  coins?: number
  text: string
}

export const TILES: Tile[] = [
  {
    id: 0,
    name: "Spawn",
    effect: "none",
    coins: 0,
    text: "The beginning. Nothing special here.",
  },
  {
    id: 1,
    name: "Safe Zone",
    effect: "none",
    coins: 0,
    text: "A moment of peace. Enjoy it while it lasts.",
  },
  {
    id: 2,
    name: "Won a Random Giveaway",
    effect: "coins",
    coins: 100,
    text: "You replied 'done' to a giveaway and somehow won!",
  },
  {
    id: 3,
    name: "Heist (Light)",
    effect: "heist_light",
    coins: 0,
    text: "Pick a target. Steal 100 coins from them.",
  },
  {
    id: 4,
    name: "Chill Vibes",
    effect: "none",
    coins: 0,
    text: "Nothing happens. Just vibes.",
  },
  {
    id: 5,
    name: "Side Hustle You Saw on YouTube",
    effect: "coins",
    coins: -50,
    text: "This 17-year-old said it made him rich. It did not.",
  },
  {
    id: 6,
    name: "Ponzi Scheme",
    effect: "ponzi",
    coins: 0,
    text: "Invest or skip? 50/50 chance to gain or lose 50% of your coins.",
  },
  {
    id: 7,
    name: "Meditation Break",
    effect: "none",
    coins: 0,
    text: "You take a breath. The chaos continues around you.",
  },
  {
    id: 8,
    name: "Heist (Heavy)",
    effect: "heist_heavy",
    coins: 0,
    text: "Pick a target. Steal 50% of their coins. Leave them with at least 50.",
  },
  {
    id: 9,
    name: "Nothing Happens",
    effect: "none",
    coins: 0,
    text: "Sit with the emptiness.",
  },
  {
    id: 10,
    name: "Also Nothing",
    effect: "none",
    coins: 0,
    text: "Still nothing. Life is like that sometimes.",
  },
  {
    id: 11,
    name: "Jail",
    effect: "jail",
    coins: 0,
    text: "You're locked up! Next correct answer skips movement.",
  },
]

export function getTileByName(name: string): Tile | undefined {
  return TILES.find((tile) => tile.name === name)
}

export function getTileById(id: number): Tile | undefined {
  return TILES.find((tile) => tile.id === id)
}
