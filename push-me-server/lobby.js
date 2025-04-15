// lobby.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import shared modules.
const { findSafeSpawnLocation } = require('./game/physics');
const { gridSize, availableSkins, botSkin, players } = require('./game/constants');
// Import the generic movement functions.
const { movePlayer: sharedMovePlayer, moveBot: sharedMoveBot } = require('./game/movement');
// Import generic bot logic functions.
const { botMoveLogic, botPunch } = require('./game/botLogic');
const { handlePunchLobby } = require('./game/punchLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());

// In the lobby we use a fixed fire pattern (center and surrounding cells).
const fires = [
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2 - 1), y: Math.floor(gridSize / 2 - 1) },
    { x: Math.floor(gridSize / 2 - 1), y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2 - 1), y: Math.floor(gridSize / 2 + 1) },
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2 - 1) },
    { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2 + 1) },
    { x: Math.floor(gridSize / 2 + 1), y: Math.floor(gridSize / 2 - 1) },
    { x: Math.floor(gridSize / 2 + 1), y: Math.floor(gridSize / 2) },
    { x: Math.floor(gridSize / 2 + 1), y: Math.floor(gridSize / 2 + 1) }
];

// In lobby mode fire is static; we do not spread it.

io.on('connection', (socket) => {
    console.log(`Lobby: Player connected: ${socket.id}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) {
        console.log(`Lobby: No safe spawn for player: ${socket.id}. Disconnecting.`);
        socket.emit('noSafeSpawn');
        socket.disconnect(true);
        return;
    }
    const usedSkins = Object.values(players)
        .filter(p => !p.isBot)
        .map(p => p.skin);
    const skin = availableSkins.find(s => !usedSkins.includes(s)) || availableSkins[0];
    players[socket.id] = {
        position: spawnLocation,
        skin,
        isBot: false,
        lastDirection: { dx: 0, dy: -1 }
    };

    // Send initial game state.
    socket.emit('initializeGame', { gridSize });
    socket.emit('updateState', { players, fires });

    // When a player moves, use sharedMovePlayer with gameMode "lobby".
    socket.on('playerMove', (move) => {
        console.log(`Lobby: Move event from ${socket.id}:`, move);
        sharedMovePlayer("lobby", socket, move, fires, io);
    });

    socket.on('playerPunch', (punchDir) => {
        handlePunchLobby(socket, punchDir, { players, fires, gridSize, findSafeSpawnLocation, io });
    });

    // When a "startGame" event is received, broadcast "switchGame" with the game URL.
    socket.on('startGame', () => {
        console.log(`Lobby: startGame received from ${socket.id}`);
        io.emit('switchGame', { gameUrl: 'http://localhost:3000' });
    });

    socket.on('disconnect', () => {
        console.log(`Lobby: Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('updateState', { players, fires });

        // Calculate the number of human players.
        const humanCount = Object.values(players).filter(p => !p.isBot).length;
        console.log("Lobby human count:", humanCount);

        // If no human players remain, clear the players object (removing the bot).
        if (humanCount === 0) {
            for (let pid in players) {
                delete players[pid];
            }
            io.emit('updateState', { players, fires });
        }
    });

    // If there is at least one human and no bot, spawn the bot.
    const humanCount = Object.values(players).filter(p => !p.isBot).length;
    const botExists = Object.values(players).some(p => p.isBot);
    if (humanCount > 0 && !botExists) {
        spawnBot();
    }
});

// In lobby mode, players and bots never die.
// When there is at least one human, spawn the bot (only one bot should exist).
// When no human players are connected, remove the bot and clear the players object.
function spawnBot() {
    const botId = "bot-" + Date.now();
    console.log(`Lobby: Spawning bot: ${botId}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) return;
    players[botId] = {
        position: spawnLocation,
        skin: botSkin,
        isBot: true,
        lastDirection: { dx: 0, dy: 1 }
    };
    io.emit('updateState', { players, fires });
    // In lobby mode, the bot continuously moves using lobby logic.
    setInterval(() => {
        botMoveLogic(botId, sharedMoveBot, botPunch, fires, io);
    }, 250);
}

server.listen(3001, () => {
    console.log("Lobby server running on port 3001");
});
