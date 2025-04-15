// app.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import shared modules.
const { findSafeSpawnLocation } = require('./game/physics');
const { gridSize, availableSkins, botSkin, players } = require('./game/constants');
// Import movement functions.
const { movePlayer: sharedMovePlayer, moveBot: sharedMoveBot } = require('./game/movement');
const { handlePunchGame } = require('./game/punchLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] } });

app.use(cors());

// In game mode, initialize fire with one random cell.
let fires = [{ x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) }];

const spreadFire = () => {
    console.log("Fire is spreading...");
    let newFires = [...fires];
    fires.forEach((fire) => {
        [[0, 1], [1, 0], [0, -1], [-1, 0]].forEach(([dx, dy]) => {
            const newFireX = fire.x + dx;
            const newFireY = fire.y + dy;
            if (
                Math.random() > 0.5 &&
                !newFires.some(f => f.x === newFireX && f.y === newFireY) &&
                newFireX >= 0 && newFireY >= 0 &&
                newFireX < gridSize && newFireY < gridSize
            ) {
                newFires.push({ x: newFireX, y: newFireY });
                Object.keys(players).forEach(playerId => {
                    const player = players[playerId];
                    if (player.position.x === newFireX && player.position.y === newFireY) {
                        if (!player.isBot) {
                            // Instead of switching lobby, mark this player as dead so they can spectate.
                            player.isAlive = false;
                            console.log(`Player ${playerId} touched fire and is now dead (isAlive set to false)`);
                        } else {
                            io.to(playerId).emit('gameOver', { socketId: playerId });
                            delete players[playerId];
                        }
                    }
                });
            }
        });
    });
    return newFires;
};

let fireSpreadInterval = null;
const updateFireInterval = () => {
    // Count effective human players regardless of alive status.
    const keys = Object.keys(players);
    let effectiveHumanCount = keys.length;
    if (keys.length > 0 && players[keys[0]].isBot) {
        effectiveHumanCount = keys.length - 1;
    }
    if (effectiveHumanCount > 0 && !fireSpreadInterval) {
        fireSpreadInterval = setInterval(() => {
            fires = spreadFire();
            io.emit('updateState', { players, fires });
            // Check the number of human players that are still alive.
            const aliveHumans = Object.keys(players).filter(pid => !players[pid].isBot && players[pid].isAlive);
            if (aliveHumans.length === 1) {
                console.log("Only one human remains alive; switching all to lobby...");
                Object.keys(players).forEach(pid => {
                    if (!players[pid].isBot) {
                        io.to(pid).emit('switchLobby', { lobbyUrl: 'http://localhost:3001' });
                        // Reset the player's alive status so they can play again later.
                        players[pid].isAlive = true;
                    }
                });
            }
        }, 3000);
    } else if (effectiveHumanCount === 0 && fireSpreadInterval) {
        clearInterval(fireSpreadInterval);
        fireSpreadInterval = null;
    }
};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) {
        console.log(`No safe spawn for player: ${socket.id}. Disconnecting.`);
        socket.emit('noSafeSpawn');
        socket.disconnect(true);
        return;
    }
    const usedSkins = Object.values(players).filter(p => !p.isBot).map(p => p.skin);
    const skin = availableSkins.find(s => !usedSkins.includes(s)) || availableSkins[0];
    // When a new player joins, mark them as alive.
    players[socket.id] = { position: spawnLocation, skin, isBot: false, isAlive: true, lastDirection: { dx: 0, dy: -1 } };

    updateFireInterval();
    socket.emit('initializeGame', { gridSize });
    socket.emit('updateState', { players, fires });

    socket.on('playerMove', (move) => {
        console.log(`Move event from ${socket.id}:`, move);
        sharedMovePlayer("game", socket, move, fires, io);
    });

    socket.on('playerPunch', (punchDir) => {
        // Check if the player is alive. In game mode, ghost players cannot punch.
        if (!players[socket.id].isAlive) {
            console.log(`Ghost ${socket.id} attempted to punch, but punches are disabled for ghosts.`);
            return;  // Early exit: do nothing.
        }
        handlePunchGame(socket, punchDir, { players, fires, gridSize, io });
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('updateState', { players, fires });
        const keys = Object.keys(players);
        let effectiveHumanCount = keys.length;
        if (keys.length > 0 && players[keys[0]].isBot) {
            effectiveHumanCount = keys.length - 1;
        }
        console.log("Effective human count:", effectiveHumanCount);
        if (effectiveHumanCount === 0) {
            resetGrid();
            updateFireInterval();
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

function resetGrid() {
    console.log("Grid reset..");
    Object.keys(players).forEach(pid => delete players[pid]);
    fires = [{ x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) }];
    io.emit('updateState', { players, fires });
}
