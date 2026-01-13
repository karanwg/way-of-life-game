# Way of Life - Technical Documentation

## Architecture Overview

This is a **peer-to-peer (P2P) multiplayer quiz board game** built with Next.js and PeerJS. The game uses WebRTC for real-time communication between players, eliminating the need for a backend server to manage game state.

### Key Technologies

- **Next.js 14**: React framework with App Router
- **PeerJS**: WebRTC abstraction for P2P connections
- **Tailwind CSS**: Utility-first styling
- **TypeScript**: Type-safe development

---

## P2P Architecture

### Host/Guest Model

1. **Host Player**: First player creates a room and becomes the host
   - Manages all game state locally in browser
   - Processes all game actions (answer submissions, dice rolls, tile effects)
   - Broadcasts state updates to all connected guests
   
2. **Guest Players**: Join using a 6-character room code
   - Send action requests to host via WebRTC
   - Receive state updates from host
   - Local state is synchronized with host's authoritative state

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      HOST BROWSER                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │              P2PGameEngine                       │    │
│  │  - Manages players Map                           │    │
│  │  - Processes answers                             │    │
│  │  - Handles dice rolls & tile effects             │    │
│  └─────────────────────────────────────────────────┘    │
│                         ▲                                │
│                         │ Local calls                    │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │              usePeerGame Hook                    │    │
│  │  - PeerJS connection management                  │    │
│  │  - Message routing                               │    │
│  │  - State synchronization                         │    │
│  └─────────────────────────────────────────────────┘    │
│              ▲                           │               │
│              │ WebRTC                    │ WebRTC        │
└──────────────┼───────────────────────────┼───────────────┘
               │                           │
               ▼                           ▼
     ┌─────────────────┐         ┌─────────────────┐
     │  GUEST BROWSER  │         │  GUEST BROWSER  │
     │                 │         │                 │
     │  usePeerGame    │         │  usePeerGame    │
     │  - Send actions │         │  - Send actions │
     │  - Receive state│         │  - Receive state│
     └─────────────────┘         └─────────────────┘
```

---

## File Structure

### Core P2P Files

| File | Purpose |
|------|---------|
| **`lib/p2p-types.ts`** | TypeScript types for P2P messages (GuestToHostMessage, HostToGuestMessage) |
| **`lib/p2p-game-engine.ts`** | Game logic engine that runs on host's browser. Manages players, processes answers, handles dice rolls and tile effects. |
| **`hooks/use-peer-game.ts`** | React hook for PeerJS connection management. Handles room creation, joining, message routing, and state synchronization. |

### UI Components

| Component | Purpose |
|-----------|---------|
| **`components/room-lobby.tsx`** | Room creation/joining UI, player lobby display |
| **`components/board.tsx`** | 12-tile elliptical game board with player pawns |
| **`components/quiz-screen.tsx`** | Question display, answer buttons, timer |
| **`components/leaderboard.tsx`** | Sorted player rankings by coins |
| **`components/event-card.tsx`** | Tile effect notification overlay |
| **`components/dice-roller.tsx`** | Animated d4 dice roll display |

### Game Data

| File | Purpose |
|------|---------|
| **`lib/questions.ts`** | Array of 20 quiz questions with options and correct answer indices |
| **`lib/board-tiles.ts`** | 12 tile definitions with effects (coins, teleport, global effects, etc.) |
| **`lib/board-logic.ts`** | Tile effect processing, dice rolling, movement calculations |
| **`lib/types.ts`** | Core TypeScript types (Player, Question, GameEvent) |

---

## Message Protocol

### Guest → Host Messages

```typescript
type GuestToHostMessage =
  | { type: "JOIN_REQUEST"; playerName: string }
  | { type: "SUBMIT_ANSWER"; playerId: string; questionIndex: number; answerIndex: number }
  | { type: "NEXT_QUESTION"; playerId: string; wasCorrect: boolean }
  | { type: "LEAVE_GAME"; playerId: string }
```

### Host → Guest Messages

```typescript
type HostToGuestMessage =
  | { type: "JOIN_ACCEPTED"; playerId: string; player: Player; allPlayers: Player[] }
  | { type: "JOIN_REJECTED"; reason: string }
  | { type: "PLAYER_JOINED"; player: Player; allPlayers: Player[] }
  | { type: "PLAYER_LEFT"; playerId: string; allPlayers: Player[] }
  | { type: "GAME_STARTED"; allPlayers: Player[] }
  | { type: "STATE_UPDATE"; allPlayers: Player[] }
  | { type: "ANSWER_RESULT"; playerId: string; correct: boolean; newCoins: number; allPlayers: Player[] }
  | { type: "MOVE_RESULT"; playerId: string; dieRoll: number | null; tileEvent: TileEvent | null; lapBonus: LapBonus | null; allPlayers: Player[] }
  | { type: "GAME_RESET" }
  | { type: "HOST_DISCONNECTED" }
```

---

## Game Flow

### 1. Room Setup

1. **Create Room**: Host enters name → `createRoom()` → PeerJS peer created with room code ID → Host added as first player
2. **Join Room**: Guest enters code + name → `joinRoom()` → Connect to host's peer → Send JOIN_REQUEST → Receive JOIN_ACCEPTED

### 2. Lobby Phase

- Host sees all connected players
- Host clicks "Start Game" → Broadcasts GAME_STARTED to all guests
- All clients transition to game view

### 3. Gameplay Loop

1. **Question Display**: 20-second timer starts
2. **Answer Submission**: Player clicks option → SUBMIT_ANSWER sent to host → Host validates → ANSWER_RESULT broadcast
3. **Movement**: If correct, NEXT_QUESTION sent → Host rolls dice, moves player, processes tile → MOVE_RESULT broadcast
4. **State Sync**: All clients update their local state from broadcast messages

### 4. Game End

- When all players complete 20 questions, GameOver screen shows final rankings

---

## Player Data Structure

```typescript
type Player = {
  id: string                    // Unique player ID
  name: string                  // Display name
  coins: number                 // Current score
  currentQuestionIndex: number  // 0-19, then complete
  answered: boolean             // Has answered current question
  selectedAnswer: number | null // Selected option index
  currentTileId: number         // Board position (0-11)
  lapsCompleted: number         // Full board circuits
  skippedNextQuestion: boolean  // Debuff from certain tiles
  nextRolledMax: number | null  // Die cap from certain tiles
}
```

---

## Tile Effects

| Effect Type | Description |
|-------------|-------------|
| `none` | No effect |
| `coins` | Add/subtract coins |
| `teleport` | Move to specific tile |
| `teleport_random` | Move to random tile |
| `move_and_coins` | Move forward + coins |
| `coins_global` | Affect all players' coins |
| `debuff_skip_next` | Skip next dice roll |
| `next_die_cap` | Limit next die roll maximum |

---

## Benefits of P2P Architecture

1. **No Server Costs**: Game runs entirely in browsers
2. **No State Loss**: No serverless cold starts or memory loss
3. **Low Latency**: Direct WebRTC connections between players
4. **Scalability**: Each game room is independent
5. **Privacy**: Game data stays between players

## Limitations

1. **Host Dependency**: If host disconnects, game ends
2. **NAT Traversal**: Some network configurations may have connectivity issues
3. **Trust Model**: Host has authority over game state (potential for cheating in competitive scenarios)

---

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Deployment

Deploy to any static hosting (Vercel, Netlify, etc.). No backend required - PeerJS uses public signaling servers by default.

For production, consider:
- Setting up your own PeerJS signaling server for reliability
- Adding TURN server support for better NAT traversal
