"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import type { Player } from "@/lib/types"
import type { RoomState } from "@/lib/p2p-types"
import { toggleBGM, isBGMPlaying, startBGM } from "@/lib/bgm"

interface RoomLobbyProps {
  roomState: RoomState
  myPlayer: Player | null
  onCreateRoom: (hostName: string) => void
  onJoinRoom: (roomCode: string, playerName: string) => void
  onStartGame: () => void
  onLeaveRoom: () => void
}

type LobbyMode = "menu" | "create" | "join" | "waiting"

// ============ HELPER COMPONENTS (defined outside to prevent remounts) ============

// BGM toggle button
function BGMToggle() {
  const [playing, setPlaying] = useState(isBGMPlaying())

  const handleToggle = () => {
    // If music hasn't started yet, start it (handles first user interaction)
    if (!isBGMPlaying()) {
      startBGM("lobby")
      setPlaying(true)
    } else {
      const nowPlaying = toggleBGM()
      setPlaying(nowPlaying)
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`
        fixed bottom-4 left-4 z-30 
        px-4 py-3 rounded-xl shadow-lg border-2 
        transition-all hover:scale-105 flex items-center gap-2
        ${playing 
          ? "bg-green-100 border-green-400 hover:bg-green-50" 
          : "bg-[#FAF8F0] border-amber-400 hover:bg-white"}
      `}
      title={playing ? "Mute music" : "Play music"}
    >
      <span className="text-xl">{playing ? "🎵" : "🔇"}</span>
      <span className={`font-semibold text-sm ${playing ? "text-green-700" : "text-amber-800"}`}>
        {playing ? "Music On" : "Music Off"}
      </span>
    </button>
  )
}

// Instructions scroll component
function InstructionsScroll() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-30 bg-[#FAF8F0] hover:bg-white px-4 py-3 rounded-xl shadow-lg border-2 border-amber-400 transition-all hover:scale-105 flex items-center gap-2"
      >
        <span className="text-xl">📜</span>
        <span className="text-amber-800 font-semibold text-sm">How to Play</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative bg-[#FAF8F0] rounded-2xl border-4 border-amber-700/80 shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden animate-bounce-in">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>📜</span> How to Play
              </h2>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors">
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="bg-white rounded-xl p-4 border border-amber-100">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><span className="text-lg">🎯</span> Goal</h3>
                <p className="text-gray-600 text-sm">Answer trivia questions, move around the board, and collect the most coins to win!</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-100">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><span className="text-lg">❓</span> Questions</h3>
                <p className="text-gray-600 text-sm">Each player answers <strong>20 questions</strong>. You have <strong>20 seconds</strong> per question.</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-100">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><span className="text-lg">💰</span> Scoring</h3>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>✅ <strong className="text-green-600">+100 coins</strong> for correct answers</li>
                  <li>❌ <strong className="text-red-500">-50 coins</strong> for wrong/timeout</li>
                  <li>🏠 <strong className="text-amber-600">+200 coins</strong> for passing GO</li>
                </ul>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-100">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><span className="text-lg">🎲</span> Movement</h3>
                <p className="text-gray-600 text-sm">Correct answers let you roll a die (1-6) and move that many spaces. Land on special tiles for bonuses or surprises!</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-amber-100">
                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><span className="text-lg">🎭</span> Special Tiles</h3>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>🎰 <strong>Chance/Casino</strong> - Random coin events</li>
                  <li>📦 <strong>Community</strong> - Shared events</li>
                  <li>💰 <strong>Tax</strong> - Pay coins</li>
                  <li>🚔 <strong>Police</strong> - Recover stolen coins</li>
                  <li>🎭 <strong>Heist</strong> - Steal from others!</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2"><span className="text-lg">🏆</span> Winning</h3>
                <p className="text-green-700 text-sm">After all 20 questions, the player with the <strong>most coins wins!</strong></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Cream card with wood-style border
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div 
      className={`bg-[#FAF8F0] rounded-2xl shadow-xl border-4 border-amber-700/80 ${className}`}
      style={{ boxShadow: "0 10px 40px rgba(139, 69, 19, 0.2)" }}
    >
      {children}
    </div>
  )
}

// Green button (Monopoly money style)
function GreenButton({ children, onClick, disabled, className = "", type = "button" }: { 
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-gradient-to-b from-green-500 to-green-700 
        hover:from-green-400 hover:to-green-600
        text-white font-bold py-4 px-6 rounded-xl
        shadow-lg shadow-green-800/30
        transition-all duration-200
        hover:-translate-y-0.5 active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        border-b-4 border-green-800
        ${className}
      `}
    >
      {children}
    </button>
  )
}

// Blue button
function BlueButton({ children, onClick, disabled, className = "", type = "button" }: { 
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-gradient-to-b from-sky-400 to-sky-600 
        hover:from-sky-300 hover:to-sky-500
        text-white font-bold py-4 px-6 rounded-xl
        shadow-lg shadow-sky-800/30
        transition-all duration-200
        hover:-translate-y-0.5 active:translate-y-0
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        border-b-4 border-sky-700
        ${className}
      `}
    >
      {children}
    </button>
  )
}

// Sky background with clouds feel
function SkyBackground({ children, showInstructions = true }: { children: React.ReactNode; showInstructions?: boolean }) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-200 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-20 left-10 w-64 h-32 bg-white rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-48 h-24 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-1/3 w-56 h-28 bg-white rounded-full blur-3xl" />
      </div>
      {children}
      <BGMToggle />
      {showInstructions && <InstructionsScroll />}
    </div>
  )
}

// ============ MAIN COMPONENT ============

export function RoomLobby({
  roomState,
  myPlayer,
  onCreateRoom,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
}: RoomLobbyProps) {
  const [mode, setMode] = useState<LobbyMode>("menu")
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return
    
    // Start music on first user interaction (browsers require user gesture)
    if (!isBGMPlaying()) {
      startBGM("lobby")
    }
    
    setIsLoading(true)
    setError(null)
    try {
      onCreateRoom(playerName.trim())
      setMode("waiting")
    } catch (err) {
      setError("Failed to create room")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim() || !roomCode.trim()) return
    
    // Start music on first user interaction (browsers require user gesture)
    if (!isBGMPlaying()) {
      startBGM("lobby")
    }
    
    setIsLoading(true)
    setError(null)
    try {
      onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim())
      setMode("waiting")
    } catch (err) {
      setError("Failed to join room")
    } finally {
      setIsLoading(false)
    }
  }

  // Waiting room
  if (roomState.connectionState === "connected" && (mode === "waiting" || roomState.players.length > 0)) {
    return (
      <SkyBackground>
        <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
          <Card className="w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h1 className="text-2xl font-black text-white text-center tracking-wide">
                🎲 Game Lobby
              </h1>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-amber-800 text-sm font-semibold mb-2 uppercase tracking-wider">Room Code</p>
                <div className="inline-block bg-white rounded-xl px-6 py-3 border-2 border-amber-300 shadow-inner">
                  <p className="text-3xl font-black text-green-700 tracking-[0.2em] font-mono">
                    {roomState.roomCode}
                  </p>
                </div>
                <p className="text-amber-700/70 text-xs mt-2">Share this code with friends!</p>
              </div>

              <div className="mb-6">
                <p className="text-amber-800 text-sm font-semibold mb-3">Players ({roomState.players.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roomState.players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-xl border-2
                        ${player.id === myPlayer?.id 
                          ? "bg-green-50 border-green-400" 
                          : "bg-white border-amber-200"}
                      `}
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                        style={{
                          background: ["#e53935", "#1e88e5", "#43a047", "#fdd835", "#8e24aa", "#f06292", "#ff7043", "#26c6da"][index % 8]
                        }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-gray-800 flex-1">{player.name}</span>
                      {index === 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold border border-amber-300">
                          👑 Host
                        </span>
                      )}
                      {player.id === myPlayer?.id && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold border border-green-300">
                          You
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center mb-6 py-3 bg-amber-50 rounded-xl border border-amber-200">
                {roomState.role === "host" ? (
                  <p className="text-amber-800 text-sm font-medium">⏳ Waiting for players to join...</p>
                ) : (
                  <p className="text-amber-800 text-sm font-medium flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Waiting for host to start...
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {roomState.role === "host" && (
                  <GreenButton onClick={onStartGame} className="w-full text-lg">
                    🚀 Start Game
                  </GreenButton>
                )}
                <button
                  onClick={onLeaveRoom}
                  className="w-full py-3 text-amber-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium border border-transparent hover:border-red-200"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </Card>
        </div>
      </SkyBackground>
    )
  }

  // Error state
  if (roomState.connectionState === "error") {
    return (
      <SkyBackground>
        <div className="relative z-10 flex items-center justify-center min-h-full p-4">
          <Card className="max-w-md w-full p-8 text-center">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
            <p className="text-gray-600 mb-6">{error || "Failed to connect. Please try again."}</p>
            <GreenButton onClick={() => { setMode("menu"); setError(null); onLeaveRoom(); }} className="w-full">
              Back to Menu
            </GreenButton>
          </Card>
        </div>
      </SkyBackground>
    )
  }

  // Connecting state
  if (roomState.connectionState === "connecting") {
    return (
      <SkyBackground>
        <div className="relative z-10 flex items-center justify-center min-h-full">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-green-800 text-lg font-semibold">Connecting...</p>
          </div>
        </div>
      </SkyBackground>
    )
  }

  // Main menu
  if (mode === "menu") {
    return (
      <SkyBackground>
        <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
          <div className="w-full max-w-md">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-8 text-center">
                <div className="text-6xl mb-3">🎲</div>
                <h1 className="text-4xl font-black text-white tracking-tight mb-1">
                  Way of Life
                </h1>
                <p className="text-green-100 font-medium">Answer • Move • Prosper</p>
              </div>
              
              <div className="p-6">
                <div className="space-y-3 mb-8">
                  <GreenButton onClick={() => setMode("create")} className="w-full text-lg">
                    🏠 Create Room
                  </GreenButton>
                  <BlueButton onClick={() => setMode("join")} className="w-full text-lg">
                    🚪 Join Room
                  </BlueButton>
                </div>

                <div className="space-y-3">
                  <p className="text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2">How to Play</p>
                  <div className="flex items-center gap-3 text-gray-700 text-sm bg-white p-3 rounded-xl border border-amber-100">
                    <span className="text-xl">🎯</span>
                    <span>Answer <strong>20 questions</strong> to move around the board</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 text-sm bg-white p-3 rounded-xl border border-amber-100">
                    <span className="text-xl">💰</span>
                    <span><strong className="text-green-600">+100</strong> correct, <strong className="text-red-500">-50</strong> wrong</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 text-sm bg-white p-3 rounded-xl border border-amber-100">
                    <span className="text-xl">🏆</span>
                    <span>Most coins at the end <strong>wins!</strong></span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </SkyBackground>
    )
  }

  // Create room
  if (mode === "create") {
    return (
      <SkyBackground>
        <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
          <Card className="w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white text-center">🏠 Create Room</h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleCreateRoom} className="space-y-5">
                <div>
                  <label className="block text-amber-800 text-sm font-semibold mb-2">Your Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-12 text-lg bg-white border-2 border-amber-200 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <GreenButton type="submit" disabled={isLoading || !playerName.trim()} className="w-full text-lg">
                  {isLoading ? "Creating..." : "Create Room"}
                </GreenButton>

                <button
                  type="button"
                  onClick={() => setMode("menu")}
                  className="w-full py-3 text-amber-700 hover:text-amber-900 transition-colors font-medium"
                >
                  ← Back
                </button>
              </form>
            </div>
          </Card>
        </div>
      </SkyBackground>
    )
  }

  // Join room
  if (mode === "join") {
    return (
      <SkyBackground>
        <div className="relative z-10 flex items-center justify-center min-h-full py-8 px-4">
          <Card className="w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white text-center">🚪 Join Room</h2>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleJoinRoom} className="space-y-5">
                <div>
                  <label className="block text-amber-800 text-sm font-semibold mb-2">Room Code</label>
                  <Input
                    type="text"
                    placeholder="XXXXXX"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                    disabled={isLoading}
                    className="w-full h-14 text-2xl font-mono font-bold tracking-[0.3em] text-center bg-white border-2 border-amber-200 text-sky-700 placeholder:text-gray-300 rounded-xl focus:border-sky-500 focus:ring-sky-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-amber-800 text-sm font-semibold mb-2">Your Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    disabled={isLoading}
                    className="w-full h-12 text-lg bg-white border-2 border-amber-200 text-gray-800 placeholder:text-gray-400 rounded-xl focus:border-sky-500 focus:ring-sky-500"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                    {error}
                  </div>
                )}

                <BlueButton type="submit" disabled={isLoading || !playerName.trim() || roomCode.length !== 6} className="w-full text-lg">
                  {isLoading ? "Joining..." : "Join Room"}
                </BlueButton>

                <button
                  type="button"
                  onClick={() => { setMode("menu"); setError(null); }}
                  className="w-full py-3 text-amber-700 hover:text-amber-900 transition-colors font-medium"
                >
                  ← Back
                </button>
              </form>
            </div>
          </Card>
        </div>
      </SkyBackground>
    )
  }

  return null
}
