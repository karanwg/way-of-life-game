export type TileEffect =
  | "none"
  | "coins"
  | "teleport"
  | "teleport_random"
  | "move_and_coins"
  | "coins_global"
  | "debuff_skip_next"
  | "next_die_cap"

export interface Tile {
  id: number
  name: string
  effect: TileEffect
  coins?: number
  movement?: number
  text: string
  target_tile?: string
  exclude_start?: boolean
  global_coins_from_others?: number
  global_coins_to_others?: number
  die_max?: number
}

export const TILES: Tile[] = [
  {
    id: 0,
    name: "Spawn / Birth Certificate",
    effect: "none",
    coins: 0,
    movement: 0,
    text: "You are born. No thoughts, no money, no responsibilities. Yet.",
  },
  {
    id: 1,
    name: "Won a Random Giveaway",
    effect: "coins",
    coins: 300,
    movement: 0,
    text: "You replied 'done' to a giveaway and somehow won.",
  },
  {
    id: 2,
    name: "Ohio Final Boss",
    effect: "teleport",
    target_tile: "Jail",
    coins: 0,
    movement: 0,
    text: "You encountered the Ohio final boss. You are not ready.",
  },
  {
    id: 3,
    name: "You Blacked Out and Woke Up Here",
    effect: "teleport_random",
    exclude_start: true,
    coins: 0,
    movement: 0,
    text: "You blacked out and woke up here.",
  },
  {
    id: 4,
    name: "A Man Asked If This Seat Is Taken",
    effect: "move_and_coins",
    coins: -100,
    movement: 1,
    text: "A man asked if this seat is taken. It was.",
  },
  {
    id: 5,
    name: "Side Hustle You Saw on YouTube",
    effect: "coins",
    coins: -250,
    movement: 0,
    text: "This 17-year-old said it made him rich. It did not.",
  },
  {
    id: 6,
    name: "You Got Married",
    effect: "coins_global",
    coins: -500,
    global_coins_from_others: 10,
    movement: 0,
    text: "You got married. Congratulations. Please open your wallet.",
  },
  {
    id: 7,
    name: "Go to Jail (Group Chat Cancelled You)",
    effect: "debuff_skip_next",
    coins: 0,
    movement: 0,
    text: "You said one thing slightly off. The group chat has decided.",
  },
  {
    id: 8,
    name: "Crypto Pump & Dump",
    effect: "coins",
    coins: -300,
    movement: 0,
    text: "You bought the dip. It kept dipping.",
  },
  {
    id: 9,
    name: "Nothing Happens",
    effect: "none",
    coins: 0,
    movement: 0,
    text: "Nothing happens. Sit with that.",
  },
  {
    id: 10,
    name: "You Went Viral for the Wrong Reason",
    effect: "coins_global",
    coins: -300,
    global_coins_to_others: 100,
    movement: 0,
    text: "Everyone's talking about you. Unfortunately.",
  },
  {
    id: 11,
    name: "Internship Grindset",
    effect: "next_die_cap",
    die_max: 2,
    coins: 0,
    movement: 0,
    text: "You're 'learning a lot' and being paid in vibes.",
  },
]

export function getTileByName(name: string): Tile | undefined {
  return TILES.find((tile) => tile.name === name)
}

export function getTileById(id: number): Tile | undefined {
  return TILES.find((tile) => tile.id === id)
}
