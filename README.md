# push-me

**push-me** is a realtime, session‑based multiplayer arena game where each player selects a unique emoji skin, practices against a lobby bot, then battles opponents in a fiery grid arena. Survive and out‑push your rivals to earn points and win rounds.

---

## Table of Contents

* [Features](#features)
* [Tech Stack](#tech-stack)
* [Getting Started](#getting-started)
* [Project Structure](#project-structure)
* [Screens & Components](#screens--components)
* [Game Flow & Rules](#game-flow--rules)
---

## Features

* **Session‑based state**: scores and selected skin persist via `sessionStorage` using a custom `useSession` hook.
* **Lobby & Bot**: practice against a bot that follows the nearest human; kill it and it respawns.
* **Character Selection**: scroll through available emoji skins, select one, then press Spacebar to confirm.
* **Physics Engine**: grid-based movement, wall collisions and bounce-back, knockback power calculation, safe spawn locations.
* **Dynamic Camera**: view pans in two halves so your avatar stays on-screen when the grid is taller than the viewport.
* **Aim Indicator**: visual preview of your next punch direction and power, scaled based on recent movement (more steps = stronger punch).
* **Arena**: fire is spreading fast, be the last one alive, or be a friendly ghost that saves everyone.
* **Ghost mechanics**: dead players become ghosts, they phase through players, extinguish fires, and help end rounds.
* **Scoring & Rounds**: surviving humans earn bonus points; extinguishing all fires grants points to all survivors.
* **Sound Effects**: howler.js powers background music and SFX (push, punch, death, extinguish).

## Tech Stack

* **Frontend**: React 18, Vite, howler.js, socket.io-client
* **Backend**: Node.js, Express, socket.io, cors, dotenv
* **Dev Tools**: Vite, ESLint, nodemon, ngrok

## Getting Started

1. **Clone the repo**

   ```bash
   git clone https://github.com/Jayce132/push-me.git
   cd push-me
   ```

2. **Install dependencies**

   ```bash
   # Client
   cd push-me-client && npm install

   # Server
   cd ../push-me-server && npm install
   ```

3. **Start the Client**
   In one terminal:

   ```bash
   cd push-me-client
   npm run dev
   ```

4. **Start the Lobby Server**
   In a second terminal:

   ```bash
   cd push-me-server
   npm run start:lobby
   ```

5. **Start the Arena Server**
   In a third terminal:

   ```bash
   cd push-me-server
   npm run start:arena
   ```

6. **Play**
   Open your browser to `http://localhost:5173`, choose a skin, practice in the lobby, then start the arena battle.

## Project Structure

```
push-me/
├── push-me-client/       # React frontend
│   ├── src/
│   │   ├── hooks/        # useSession, useGameSocket, useGridDimensions, useCamera, usePlayerControls
│   │   ├── screens/      # CharacterSelector, LobbyGrid, ArenaGrid
│   │   ├── components/   # Sidebar, PlayerList, Lobby/Arena Controls, Cell, Wall, Player, Ghost, Fire, AimIndicator, PunchIndicator
│   │   ├── sounds.js     # howler.js setup
│   │   ├── config.js     # LOBBY_URL, ARENA_URL
│   │   └── App.jsx
│   └── package.json
└── push-me-server/       # Node.js servers
    ├── index.js          # mode dispatch (lobby vs arena)
    ├── server/
    │   ├── LobbyServer.js # backend logic for the Lobby, has a bot
    │   ├── ArenaServer.js # backend logic for the Arena, no bot, but has a scoring system and fire spread
    │   └── utils/         # sharedGame: Player factory, serializers, skin assignment
    ├── game/             # PhysicsEngine, FireManager, PunchingEntity, other entities and cell types
    └── package.json
```

## Screens & Components

### CharacterSelector

* Fetches available skins from `LOBBY_URL` and displays them in a horizontally scrollable selector.
* Player confirms selection by pressing Spacebar.
* Plays background music on mount and provides mute/unmute toggle.
* Only free skins are shown; chosen skin is saved to session storage.

### LobbyGrid

* Connects to the lobby server via WebSocket and receives real-time updates on players and the bot.
* Renders:
  * A grid of `<Cell>`s inside a bordered wall.
  * Live players using `<Player>`, ghosts using `<Ghost>`, and walls via `<Wall>`.
* Displays a bot that follows the nearest player and respawns after death.
* Player inputs (`WASD`/arrows to move, `Space` to punch) are sent via socket events.
* Includes `<AimIndicator>` showing current punch direction and power.
* Uses `useCamera` to smoothly pan the viewport to the player’s side of the grid if the arena doesn’t fit vertically.
* Left sidebar contains lobby controls (e.g. start button); right sidebar shows player list.

### ArenaGrid

* Connects to the arena server via WebSocket and listens for arena state and fire updates.
* Renders:
  * Grid of `<Cell>`s, surrounded by `<Wall>`s.
  * Players as `<Player>` or `<Ghost>`, and fires as `<Fire>`.
* Fires spread periodically and interact with players (causing death) and ghosts (can be extinguished).
* Player actions are the same as in the lobby, but the arena adds fire survival mechanics and scoring.
* Includes `<AimIndicator>` that visually reflects punch direction and strength (based on steps walked).
* Uses `useCamera` to scroll the viewport horizontally and vertically depending on the player's position and the grid size.
* Left sidebar shows arena controls (e.g. leave match); right sidebar shows player list.

## Game Flow & Rules

1. **Character Selection**: Choose a unique emoji skin, press Spacebar to join lobby. Score starts at 0.
2. **Lobby**: Practice against a respawning bot. Move (`arrow`/`WASD`) and punch (`Space`). Host presses “Start” to begin arena.
3. **Arena Round**:

   * Fires spawn and spread each tick.
   * Players push/punch into walls or each other:

     * **Wall**: walking into bounces back only 1 cell; punching knocks you back more cells based on strength and distance.
     * **Punch**: base power 3 + 1 per 6 steps (max +3).
   * **Death**:  
     * Entering or being knocked into a fire cell results in death.
     * If a knocked-back player lands on another, the one being landed on dies.
   * **Ghosts**: dead players can phase through, extinguish fires by punching, and earn no further kills.
4. **Round End**:

   * Ends when ≤1 human alive or all fires extinguished.
   * If only one survivor: bonus points = (# humans − 1). If multiple survivors (fires out): each survivor +1.
   * All players (with updated scores and skins) are sent back to lobby.
5. **Repeat Rounds**: Continue until players exit.


