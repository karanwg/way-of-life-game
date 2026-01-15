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
│  │  - Scales coin effects based on average wealth   │    │
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
| **`lib/p2p-game-engine.ts`** | Game logic engine that runs on host's browser. Manages players, processes answers, handles dice rolls and tile effects with dynamic scaling. |
| **`hooks/use-peer-game.ts`** | React hook for PeerJS connection management. Handles room creation, joining, message routing, and state synchronization. |

### UI Components

| Component | Purpose |
|-----------|---------|
| **`components/room-lobby.tsx`** | Room creation/joining UI, player lobby display |
| **`components/board.tsx`** | 24-tile Monopoly-style game board with player pawns |
| **`components/quiz-screen.tsx`** | Question display, answer buttons, timer |
| **`components/leaderboard.tsx`** | Sorted player rankings by coins |
| **`components/event-card.tsx`** | Tile effect notification overlay |
| **`components/dice-roller.tsx`** | Animated d6 dice roll display |

### Game Data

| File | Purpose |
|------|---------|
| **`lib/questions.ts`** | Array of quiz questions with options and correct answer indices |
| **`lib/board-tiles.ts`** | 24 tile definitions with effects (coins, heists, gambling, global effects) |
| **`lib/board-logic.ts`** | Dice rolling, movement calculations, random chance functions |
| **`lib/coin-scaling.ts`** | Shared utility for scaling coin amounts based on average player wealth |
| **`lib/types.ts`** | Core TypeScript types (Player, Question, GameEvent) |

---

## Message Protocol

### Guest → Host Messages

```typescript
type GuestToHostMessage =
  | { type: "JOIN_REQUEST"; playerName: string }
  | { type: "SUBMIT_ANSWER"; playerId: string; questionIndex: number; answerIndex: number }
  | { type: "NEXT_QUESTION"; playerId: string; wasCorrect: boolean }
  | { type: "HEIST_TARGET"; playerId: string; targetId: string }
  | { type: "PONZI_CHOICE"; playerId: string; invest: boolean }
  | { type: "POLICE_TARGET"; playerId: string; targetId: string }
  | { type: "SWAP_MEET_TARGET"; playerId: string; targetId: string }
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
  | { type: "MOVE_RESULT"; playerId: string; moveResult: MoveResult; allPlayers: Player[] }
  | { type: "HEIST_RESULT"; heistResult: HeistResultData; allPlayers: Player[] }
  | { type: "PONZI_RESULT"; ponziResult: PonziResultData; allPlayers: Player[] }
  | { type: "POLICE_RESULT"; policeResult: PoliceResultData; allPlayers: Player[] }
  | { type: "SWAP_MEET_RESULT"; swapMeetResult: SwapMeetResultData; allPlayers: Player[] }
  | { type: "IDENTITY_THEFT_EVENT"; identityTheftEvent: IdentityTheftResultData; allPlayers: Player[] }
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

1. **Question Display**: Timer starts
2. **Answer Submission**: Player clicks option → SUBMIT_ANSWER sent to host → Host validates → ANSWER_RESULT broadcast
3. **Movement**: If correct, NEXT_QUESTION sent → Host rolls d6 dice, moves player, processes tile → MOVE_RESULT broadcast
4. **Interactive Effects**: Some tiles trigger interactive prompts (heist target selection, gambling choice, etc.)
5. **State Sync**: All clients update their local state from broadcast messages

### 4. Game End

- When all players complete all questions, GameOver screen shows final rankings

---

## Player Data Structure

```typescript
type Player = {
  id: string                    // Unique player ID
  name: string                  // Display name
  coins: number                 // Current score (can be negative)
  currentQuestionIndex: number  // Progress through questions
  answered: boolean             // Has answered current question
  selectedAnswer: number | null // Selected option index
  currentTileId: number         // Board position (0-23)
  lapsCompleted: number         // Full board circuits
}
```

---

## Tile Effects

The board has 24 tiles with various effects. Coin gain/loss tiles scale dynamically based on the average coins of all players.

### Effect Types

| Effect Type | Description |
|-------------|-------------|
| `none` | No effect (safe space) |
| `coins` | Add/subtract coins (scales with average wealth) |
| `heist_10` | Steal 10% from a chosen player |
| `heist_100` | Steal up to 100 coins from a chosen player |
| `heist_50` | Steal 50% from a chosen player |
| `ponzi` | Gamble: 75% chance to double coins, 25% chance to lose half |
| `police_station` | Report someone: they lose 300 coins |
| `robin_hood` | Take 150 from richest player, give to poorest |
| `tax_collector` | Take 25 coins from every other player |
| `party_time` | Everyone (including you) gets 50 coins |
| `swap_meet` | Choose a player to swap ALL coins with |
| `banana_peel` | Push a random player back 3 spaces |
| `coin_magnet` | Steal 20 coins from each other player |
| `money_bomb` | Every other player loses 50 coins |

### Dynamic Coin Scaling

Coin gain/loss tiles scale based on the average coins of all players:

- **Base reference**: 500 coins
- **Formula**: `multiplier = max(1, averageCoins / 500)`
- **Examples**:
  - Average 500 coins → 1x (base amounts)
  - Average 1000 coins → 2x
  - Average 2000 coins → 4x
  - Average 3000 coins → 6x

This keeps tile effects impactful throughout the game as players accumulate wealth.

### Special Events

- **Identity Theft**: 25% chance when two players land on the same tile - their coins are swapped!
- **Lap Bonus**: +200 coins when passing GO (tile 0)

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
