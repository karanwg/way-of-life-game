export type TileEffect =
  | "none"
  | "coins"
  | "heist_10"
  | "heist_100"
  | "heist_50"
  | "ponzi"
  | "police_station"

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
    name: "Home",
    effect: "coins",
    coins: 100,
    text: "Home sweet home! Collect your bonus.",
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
    name: "Pickpocket",
    effect: "heist_10",
    coins: 0,
    text: "Sneak up and skim 10% off someone's wallet.",
  },
  {
    id: 3,
    name: "Quick Heist",
    effect: "heist_100",
    coins: 0,
    text: "A clean grab. Take 100 coins from someone.",
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
    name: "Side Hustle",
    effect: "coins",
    coins: -50,
    text: "That YouTube guru lied. You're down 50.",
  },
  {
    id: 6,
    name: "Ponzi Scheme",
    effect: "ponzi",
    coins: 0,
    text: "75% chance to double your coins. 25% chance to lose half.",
  },
  {
    id: 7,
    name: "Nothing Happens",
    effect: "none",
    coins: 0,
    text: "The universe ignores you today.",
  },
  {
    id: 8,
    name: "Grand Heist",
    effect: "heist_50",
    coins: 0,
    text: "Go big. Steal 50% of someone's entire fortune.",
  },
  {
    id: 9,
    name: "Also Nothing",
    effect: "none",
    coins: 0,
    text: "Still nothing. Life is like that sometimes.",
  },
  {
    id: 10,
    name: "Crypto Casino",
    effect: "ponzi",
    coins: 0,
    text: "75% chance to double your coins. 25% chance to lose half.",
  },
  {
    id: 11,
    name: "Police Station",
    effect: "police_station",
    coins: 0,
    text: "Snitch on someone. They lose 300 coins.",
  },
]

export function getTileByName(name: string): Tile | undefined {
  return TILES.find((tile) => tile.name === name)
}

export function getTileById(id: number): Tile | undefined {
  return TILES.find((tile) => tile.id === id)
}
