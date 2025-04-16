const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import shared modules.
const { findSafeSpawnLocation } = require('./game/physics');
const { gridSize, availableSkins, botSkin, players } = require('./game/constants');
// Import the shared movement function for human players.
const { movePlayer } = require('./game/movement');
// Import punch logic for lobby.
const { handlePunch} = require('./game/punchLogic');
// Import our Bot entity.
const Bot = require('./game/Bot');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());

const fires = [];

io.on('connection', (socket) => {
    console.log(`Lobby: Player connected: ${socket.id}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) {
        console.log(`Lobby: No safe spawn for player: ${socket.id}. Disconnecting.`);
        socket.emit('noSafeSpawn');
        socket.disconnect(true);
        return;
    }
    // Ensure unique skins for human players.
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
        movePlayer(socket, move, io, fires);
    });

    // Handle the punch event for lobby players.
    socket.on('playerPunch', (punchDir) => {
        handlePunch(socket, punchDir, { players, gridSize, findSafeSpawnLocation, io });
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

        // If no human players remain, clear the players object (removing any bots).
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
function spawnBot() {
    const botId = "bot-" + Date.now();
    console.log(`Lobby: Spawning bot: ${botId}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) return;

    // Create the game context that will be shared with the Bot.
    const gameContext = { players, fires, io, gridSize };
    // Create a new Bot instance.
    const bot = new Bot(botId, spawnLocation, gameContext);

    // Add the bot to the global players list.
    players[botId] = {
        position: bot.position,
        skin: bot.skin,
        isBot: true,
        lastDirection: bot.lastDirection
    };
    io.emit('updateState', { players, fires });

    // In lobby mode, continuously update the bot's behavior.
    setInterval(() => {
        bot.update();
    }, 250);
}

server.listen(3001, () => {
    console.log("Lobby server running on port 3001");
});
