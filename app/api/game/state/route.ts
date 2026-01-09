import { getAllPlayers } from "@/lib/game-store"
import { NextResponse } from "next/server"

export async function GET() {
  const players = getAllPlayers()
  return NextResponse.json({ players })
}
