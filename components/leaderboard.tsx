"use client"

import type { Player } from "@/lib/types"
import { Trophy } from "lucide-react"

interface LeaderboardProps {
  players: Player[]
}

export function Leaderboard({ players }: LeaderboardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">Leaderboard</h2>
      </div>

      <div className="space-y-2 flex-1 overflow-y-auto">
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Waiting for players...</p>
        ) : (
          players.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between bg-background border border-border rounded-md p-3 transition-all hover:border-primary/50"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{index + 1}</span>
                </div>
                <span className="text-sm font-medium text-foreground truncate">{player.name}</span>
              </div>
              <span className="text-sm font-bold text-primary flex-shrink-0">{player.coins}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
