# Way of Life - Technical Documentation

## Overview

**Way of Life** is a multiplayer Monopoly-style quiz game built with Next.js, React, and TypeScript. Players answer multiple-choice questions, roll a d4 die (only on correct answers), move around a circular 12-tile board, and experience various tile effects that award or deduct coins. The game features real-time leaderboard updates, animated dice rolls, colorful player pawns, and impactful event cards. Designed with a playful, kid-friendly aesthetic.

### Key Characteristics

- **Demo/Prototype**: Single-process, in-memory state with no persistence
- **Multiplayer Simulation**: Multiple browser tabs share the same server state
- **Server Authority**: All game logic, scoring, and validation enforced server-side
- **Real-time Updates**: Client state syncs via polling (500ms interval)
- **Node.js Runtime**: Uses native Node.js APIs (not Edge runtime)

---

## Architecture

### Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Runtime**: Node.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: React hooks + in-memory server state
- **Real-time**: HTTP polling (EventSource/SSE initially planned but replaced)

### Data Flow

```
Client → API Route → Game Store → EventEmitter → (Internal Events)
                                    ↓
Client ← Polling Route ← Game Store (State Snapshot)
```

1. **Client Actions**: User interactions (join, answer, next question) → `/api/game` POST
2. **Server Mutation**: API route updates in-memory `gameState` via `game-store.ts` functions
3. **Event Emission**: `EventEmitter` broadcasts internal events (for future extensibility)
4. **State Sync**: Client polls `/api/game/state` every 500ms to fetch latest player list
5. **UI Updates**: React components re-render based on polled state

---

## File Structure

### Core Game Logic (Server-Side)

| File | Purpose |
|------|---------|
| **`lib/game-store.ts`** | Singleton in-memory store holding `Map<playerId, Player>`. Exports functions: `addPlayer`, `updatePlayerAnswer`, `advanceQuestion`, `advanceQuestionNoMove`, `resetGameState`, `getAllPlayers`, `getPlayer`. Uses `EventEmitter` for internal pub/sub. |
| **`lib/board-logic.ts`** | Tile effect processing engine. Exports `processTileEffect` (handles all 9 tile effect types), `rollDie` (d4/d6 random), `movePlayerForward` (modulo-12 circular movement). |
| **`lib/board-tiles.ts`** | Defines 12 `Tile` objects with effects, coins, text, and metadata. Exports `TILES` array and lookup utilities. |
| **`lib/questions.ts`** | Array of 20 hardcoded MCQ questions with 4 options each. |
| **`lib/types.ts`** | TypeScript types: `Player`, `Question`, `GameEvent`, `GameState`, `TileEffect`, `Tile`. |
| **`lib/game-events.ts`** | EventEmitter singleton (`gameEventEmitter`) for server-side pub/sub. |

### API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| **`/api/game`** | POST | Main game action handler. Accepts `action` field: `"join"` (create player), `"answer"` (submit answer), `"next-question"` (advance + roll die), `"get-state"` (fetch current state), `"reset"` (admin reset). |
| **`/api/game/state`** | GET | Returns serialized `{ players: Player[] }` for client polling. |
| **`/api/game/stream`** | GET | Legacy SSE endpoint (replaced by polling, may be unused). |

### Frontend Components

| Component | Purpose |
|-----------|---------|
| **`app/page.tsx`** | Main game orchestrator. Manages `currentPlayer` state, handles player lifecycle (join → quiz → game over), renders 3-panel layout (board + leaderboard + quiz). |
| **`components/name-entry.tsx`** | Start screen. Gradient background, glassmorphism card, name input, admin reset button. |
| **`components/quiz-screen.tsx`** | Bottom panel (35% height). Displays question, 2×2 colored answer buttons, countdown timer (top-right), feedback messages. Auto-advances after 1.5s (correct) or 5s (wrong/timeout). |
| **`components/board.tsx`** | Top-left panel (48.75% width). Renders 12 tiles in elliptical track, player pawns positioned below tiles, animated transitions. |
| **`components/leaderboard.tsx`** | Top-right panel (16.25% width). Lists players sorted by coins descending, shows medals for top 3, color-coded player indicators. |
| **`components/event-card.tsx`** | Modal overlay on board. Displays tile name, effect text, coin delta with animations. Auto-dismisses after 5s or manual close. |
| **`components/dice-roller.tsx`** | Full-screen overlay. Animated d4 die with 3D spin, shows result after 2s animation, sparkle effects. |
| **`components/player-pawn.tsx`** | Chess-piece styled SVG pawn with player color and label. |
| **`components/countdown-timer.tsx`** | SVG circle timer (20s). Animates stroke-dashoffset, turns red at ≤5s. |
| **`components/game-over.tsx`** | Final screen. Podium for top 3, confetti animation, full leaderboard, play again button. |

### Hooks

| Hook | Purpose |
|------|---------|
| **`hooks/use-game-stream.ts`** | Polling mechanism. Fetches `/api/game/state` every 500ms, compares player arrays, triggers callbacks on changes. Handles retry/error states. |

---

## Game Mechanics

### Quiz Flow

1. **Name Entry**: Player enters name → POST `/api/game` with `action: "join"` → Server generates UUID and adds player to `gameState.players`
2. **Question Display**: Client fetches question from local `QUESTIONS` array (20 questions shared)
3. **Answer Submission**: Player clicks option → POST `/api/game` with `action: "answer"` → Server validates, awards +100 (correct) or -50 (incorrect) coins
4. **Feedback Display**: Client shows green (correct) or red (incorrect) banner for 1.5s (correct) or 5s (wrong)
5. **Auto-Advance**: 
   - **Correct**: After 1.5s → POST `action: "next-question"` with `wasCorrect: true` → Server rolls d4 die, moves player, processes tile effect
   - **Wrong**: After 5s → POST `action: "next-question"` with `wasCorrect: false` → Server skips die roll, only advances question index
6. **Dice Animation**: (Only on correct answers) Client shows `DiceRoller` overlay with 2s spinning animation, displays result
7. **Tile Event**: If tile has effects, `EventCard` overlay shows tile name, text, coin delta
8. **Repeat**: Steps 2-7 until player reaches question 20

### Timeout Handling

- If 20s countdown expires without answer, `handleTimeExpired` is called:
  - Client shows red "Time expired! -50 coins" feedback
  - Submits answer with `answerIndex: -1`
  - Server treats as incorrect, deducts 50 coins
  - Auto-advances after 5s with `wasCorrect: false` (no die roll)

### Board Mechanics

- **12 Tiles**: Circular/elliptical track numbered 0-11
- **Movement**: Player position stored as `currentTileId` (0-11)
- **Die Roll**: `Math.floor(Math.random() * maxValue) + 1` where `maxValue = 4` (d4) or capped by tile effects
- **Lap Detection**: If `newTileId < previousTileId` and `previousTileId !== 0`, player crossed Spawn → `lapsCompleted++`
- **Tile Landing**: After movement, `processTileEffect` executes, modifies coins/position/debuffs

### Tile Effects (9 Types)

| Effect | Description | Example Tile |
|--------|-------------|--------------|
| **`none`** | No effect | "Nothing Happens" |
| **`coins`** | Award or deduct coins | "Won a Random Giveaway" (+300) |
| **`lap_complete`** | Award lap bonus (300 coins) when landing on Spawn after first lap. No message on initial spawn. | "Spawn" |
| **`teleport`** | Move to specific tile by name | "Ohio Final Boss" → "Jail" |
| **`teleport_random`** | Move to random tile (optionally exclude Spawn) | "You Blacked Out" |
| **`move_and_coins`** | Move forward N tiles + coin delta | "Seat Is Taken" (+1 tile, -100 coins) |
| **`coins_global`** | Redistribute coins between current player and all others | "Got Married" (-500 self, +10 to each other) |
| **`debuff_skip_next`** | Set `skippedNextQuestion = true`, player auto-advances next turn without rolling | "Jail" |
| **`next_die_cap`** | Cap next die roll to `die_max` (e.g., d2 instead of d4) | "Internship Grindset" (max 2) |

### Scoring Rules

- **Correct Answer**: +100 coins
- **Incorrect/Timeout**: -50 coins
- **Tile Effects**: Variable (see tile definitions in `board-tiles.ts`)
- **Lap Bonus**: +300 coins when landing on Spawn after completing a lap

### Game End Condition

- Game ends when all players reach `currentQuestionIndex >= 20` (all 20 questions answered)
- Transition to `GameOver` screen showing final leaderboard sorted by coins descending

---

## State Management

### Server State (Authoritative)

```typescript
// lib/game-store.ts
let gameState: GameState = {
  players: Map<playerId: string, Player>
}
```

**Player Object**:
```typescript
{
  id: string              // UUID
  name: string            // Display name
  coins: number           // Current coin balance
  currentQuestionIndex: number  // 0-19 (20 = game complete)
  answered: boolean       // Has answered current question
  selectedAnswer: number | null  // 0-3 or null
  currentTileId: number   // 0-11 (board position)
  lapsCompleted: number   // Number of times passed Spawn
  skippedNextQuestion: boolean  // Debuff flag (Jail tile)
  nextRolledMax: number | null  // Die cap (e.g., 2 for Internship tile)
}
```

### Client State (Derived)

```typescript
// app/page.tsx
const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
const [allPlayers, setAllPlayers] = useState<Player[]>([])
const [currentEvent, setCurrentEvent] = useState<TileEvent | null>(null)
const [diceRoll, setDiceRoll] = useState<number | null>(null)
```

**State Sync**: `useGameStream` hook polls every 500ms, compares player arrays, calls `onPlayersUpdate` callback when differences detected.

---

## API Reference

### POST `/api/game`

**Request Body**:
```json
{
  "action": "join" | "answer" | "next-question" | "get-state" | "reset",
  "playerName"?: string,      // Required for "join"
  "playerId"?: string,        // Required for all except "join"
  "questionIndex"?: number,   // Required for "answer"
  "answerIndex"?: number,     // Required for "answer" (0-3 or -1 for timeout)
  "wasCorrect"?: boolean      // Required for "next-question"
}
```

**Response Examples**:

**Join**:
```json
{
  "success": true,
  "playerId": "uuid-string",
  "player": { ...Player object }
}
```

**Answer**:
```json
{
  "success": true,
  "correct": true,
  "newCoins": 100,
  "question": { ...Question object }
}
```

**Next Question**:
```json
{
  "success": true,
  "player": { ...Player object },
  "nextQuestionIndex": 1,
  "dieRoll": 3,              // null if wasCorrect: false
  "tileEvent": {             // null if no effect
    "tileName": "Won a Random Giveaway",
    "tileText": "You replied 'done' to a giveaway and somehow won.",
    "coinsDelta": 300,
    "isGlobal": false
  }
}
```

### GET `/api/game/state`

**Response**:
```json
{
  "players": [
    { ...Player object },
    { ...Player object }
  ]
}
```

---

## UI/UX Design

### Layout

**3-Panel Split**:
- **Top Section (65vh)**: Split horizontally
  - **Left (75%)**: Board with 12 tiles + player pawns
  - **Right (25%)**: Live leaderboard
- **Bottom Section (35vh)**: Quiz interface (question + 2×2 answer grid + timer)

**Viewport Constraints**:
- Fixed to `100vh` × `100vw` with `overflow: hidden` on `<body>` and `<html>`
- No scrolling

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#ec4899` (Pink) | Buttons, highlights, event card accents |
| `--color-secondary` | `#06b6d4` (Cyan) | Borders, accents, interactive elements |
| `--color-accent` | `#fbbf24` (Amber) | Emphasis, coin indicators |
| `--color-success` | `#10b981` (Green) | Correct answer feedback |
| `--color-error` | `#ef4444` (Red) | Incorrect answer feedback |
| Background | `#0f172a` (Dark Blue) | Base background |

**Player Colors**: `#ec4899` (pink), `#06b6d4` (cyan), `#fbbf24` (amber), `#10b981` (green), `#a78bfa` (purple), `#f97316` (orange)

### Animations

- **Dice Roll**: 3D CSS `rotateX`/`rotateY` animation (2s duration)
- **Event Card**: Scale + fade-in entrance, auto-dismiss after 5s
- **Countdown Timer**: SVG `stroke-dashoffset` animation (20s linear)
- **Player Pawn**: Smooth position transitions (`transition-all duration-500`)
- **Coin Delta**: Floating text animation with scale + fade

### Typography

- **Headings**: `font-sans` (default), bold weights (700-900)
- **Body**: `font-sans`, regular (400) and medium (500) weights
- **Tile Names**: `text-xs` to `text-sm`, uppercase, `font-semibold`
- **Question Text**: `text-base` to `text-lg`, `font-semibold`

---

## Key Implementation Details

### No Dice Roll on Wrong Answer

When `wasCorrect: false` is passed to `next-question` action:
1. API route calls `advanceQuestionNoMove(playerId)` instead of `advanceQuestion(playerId)`
2. `advanceQuestionNoMove` only increments `currentQuestionIndex`, skips die roll and tile processing
3. Client does not show `DiceRoller` overlay
4. Player locks for 5 seconds before auto-advancing (visual feedback)

### Lap Bonus Logic

- Spawn tile has `effect: "lap_complete"` and `lapBonus: 300`
- `processTileEffect` receives `isFirstLanding` flag:
  - `true` (game start): Skip event, award 0 coins
  - `false` (after lap): Award `lapBonus` (300), show event card
- `advanceQuestion` detects lap by checking if `newTileId < previousTileId` (wrapped around)

### Tile Size and Positioning

- Tiles positioned on elliptical path using trigonometry:
  ```typescript
  const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
  const x = centerX + radiusX * Math.cos(angle)
  const y = centerY + radiusY * Math.sin(angle)
  ```
- Responsive sizing: `w-[24%] md:w-[120px] lg:w-[180px]`
- Tiles have unique background colors based on effect type

### Player Pawn Rendering

- Pawns positioned slightly below their tile using `translate-y-14`
- Multiple players on same tile stack horizontally with `translate-x-N`
- SVG chess pawn shape with player color fill
- Player name label below pawn

### Event Card Display

- Mounted as portal over board using absolute positioning
- Single card at a time (new events replace current)
- Emoji icons matched to tile effects (💰, 🚀, 💀, 🎉, etc.)
- Gradient backgrounds color-coded by effect type

### Timer Animation Fix

Original implementation used CSS `clip-path` with `inset()`, which had rendering issues. Fixed by using SVG `<circle>` with animated `stroke-dashoffset`:

```typescript
<circle
  cx="20" cy="20" r="18"
  strokeDasharray={circumference}
  strokeDashoffset={offset}  // Animated via inline style
  className="transition-all duration-1000 linear"
/>
```

### State Persistence Issue Fix

Bug: Players were kicked to start screen after answering questions.

**Root Cause**: `currentPlayer` state in `app/page.tsx` was not synced with polling updates. If `allPlayers` array temporarily became empty (transient API failure), `currentPlayer` remained stale.

**Fix**: Added `useEffect` that finds and updates `currentPlayer` from `allPlayers` by matching `player.id`:

```typescript
useEffect(() => {
  if (currentPlayer && allPlayers.length > 0) {
    const updated = allPlayers.find((p) => p.id === currentPlayer.id)
    if (updated && JSON.stringify(updated) !== JSON.stringify(currentPlayer)) {
      setCurrentPlayer(updated)
    }
  }
}, [allPlayers, currentPlayer])
```

---

## Running the Game Locally

### Prerequisites

- Node.js 18+ (uses native `crypto.randomUUID`)
- npm or pnpm

### Steps

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd way-of-life-game
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Open Game**:
   - Navigate to `http://localhost:3000`
   - Open multiple tabs to simulate multiplayer

5. **Admin Reset**:
   - Click "Reset Server State" button on start screen to clear all players

### Important Notes

- **State is ephemeral**: Restarting the dev server clears all game data
- **Single-process only**: Does not support horizontal scaling or multiple server instances
- **No database required**: All data lives in `lib/game-store.ts` in-memory Map

---

## Future Extensibility

### Potential Enhancements

1. **Database Integration**: Replace in-memory Map with PostgreSQL/MongoDB for persistence
2. **WebSockets**: Replace polling with Socket.IO for true real-time updates
3. **Multiple Game Rooms**: Add room ID concept for isolated game sessions
4. **Custom Question Sets**: Allow admins to upload custom MCQ banks
5. **Power-ups**: Introduce one-time-use items (shields, coin doublers, dice modifiers)
6. **Achievements**: Track player stats across games (total coins earned, questions answered, laps completed)
7. **Sound Effects**: Add audio cues for dice rolls, tile landings, coin gains/losses
8. **Animations**: Enhance player pawn movement with smooth path-following animations

### Code Extension Points

- **New Tile Effects**: Add to `TileEffect` union type in `types.ts`, handle in `processTileEffect` switch statement
- **Custom Game Rules**: Modify scoring constants in `updatePlayerAnswer` (currently +100/-50)
- **Question Banks**: Replace `QUESTIONS` array with dynamic fetching from API/database
- **Event Hooks**: Subscribe to `gameEventEmitter` events in `lib/game-events.ts` for side effects (logging, analytics, webhooks)

---

## Troubleshooting

### Common Issues

1. **"Failed to join game" Error**:
   - Check `/api/game` route logs for UUID generation errors
   - Ensure Node.js version supports `crypto.randomUUID` (18+)

2. **Players Not Appearing in Leaderboard**:
   - Verify polling is active (check Network tab for `/api/game/state` requests)
   - Check `useGameStream` hook for retry logic triggering

3. **Dice Not Rolling on Correct Answers**:
   - Confirm `wasCorrect: true` is passed to `next-question` action
   - Check `advanceQuestion` vs `advanceQuestionNoMove` routing in API

4. **Timer Animation Broken**:
   - Ensure SVG `stroke-dashoffset` is calculated correctly (circumference = 2πr)
   - Verify `duration-1000` Tailwind class is applied

5. **Layout Overflow/Scrolling**:
   - Check `app/layout.tsx` has `overflow-hidden` on `<body>`
   - Verify all panels use `vh` units (top: 65vh, bottom: 35vh)

---

## Credits

- **Framework**: [Next.js](https://nextjs.org/)
- **UI Components**: Custom components with [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: Emoji-based (native Unicode)
- **Inspiration**: Monopoly board game mechanics

---

## License

This is a demo/prototype project. Not licensed for production use.
