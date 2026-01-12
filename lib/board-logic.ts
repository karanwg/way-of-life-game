import type { Tile } from "./board-tiles"
import { TILES, getTileByName } from "./board-tiles"
import type { Player } from "./types"

export interface TileEffectResult {
  coinsDelta: number
  newTileId?: number
  skippedNext?: boolean
  nextRolledMax?: number | null
  globalEffect?: {
    affectedPlayers: string[]
    coinsPerPlayer: number
  }
  teleportedFrom?: string
  teleportedTo?: string
  skipEvent?: boolean
}

export function processTileEffect(
  player: Player,
  tile: Tile,
  allPlayers: Map<string, Player>,
): TileEffectResult {
  const result: TileEffectResult = {
    coinsDelta: tile.coins || 0,
  }

  switch (tile.effect) {
    case "none":
      break

    case "coins":
      // Simple coin award or deduction
      break

    case "teleport":
      // Teleport to a specific tile by name
      if (tile.target_tile) {
        const targetTile = getTileByName(tile.target_tile)
        if (targetTile) {
          result.newTileId = targetTile.id
          result.teleportedFrom = tile.name
          result.teleportedTo = targetTile.name
        }
      }
      break

    case "teleport_random":
      // Teleport to a random tile (excluding start if specified)
      const excludeIds = tile.exclude_start ? [0] : []
      const validTiles = TILES.filter((t) => !excludeIds.includes(t.id))
      const randomTile = validTiles[Math.floor(Math.random() * validTiles.length)]
      result.newTileId = randomTile.id
      result.teleportedFrom = tile.name
      result.teleportedTo = randomTile.name
      break

    case "move_and_coins":
      // Move forward 1 tile and apply coins
      const nextTileId = (player.currentTileId + (tile.movement || 0)) % TILES.length
      result.newTileId = nextTileId
      break

    case "coins_global":
      // Deduct from self and give to all others (or vice versa)
      if (tile.global_coins_from_others) {
        // Player receives coins from all others
        const otherPlayers = Array.from(allPlayers.values()).filter((p) => p.id !== player.id)
        result.coinsDelta = (tile.global_coins_from_others || 0) * otherPlayers.length
        result.globalEffect = {
          affectedPlayers: otherPlayers.map((p) => p.id),
          coinsPerPlayer: -(tile.global_coins_from_others || 0),
        }
      } else if (tile.global_coins_to_others) {
        // Player gives coins to all others
        const otherPlayers = Array.from(allPlayers.values()).filter((p) => p.id !== player.id)
        result.coinsDelta = -(tile.global_coins_to_others || 0) * otherPlayers.length
        result.globalEffect = {
          affectedPlayers: otherPlayers.map((p) => p.id),
          coinsPerPlayer: tile.global_coins_to_others || 0,
        }
      }
      break

    case "debuff_skip_next":
      // Skip next question
      result.skippedNext = true
      break

    case "next_die_cap":
      // Cap next die roll
      result.nextRolledMax = tile.die_max || null
      break
  }

  return result
}

export function rollDie(maxValue = 6): number {
  return Math.floor(Math.random() * maxValue) + 1
}

export function movePlayerForward(currentTileId: number, steps: number): number {
  return (currentTileId + steps) % TILES.length
}
