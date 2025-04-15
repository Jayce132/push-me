const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
const gridSize = 25;

// Define available skins for human players
const availableSkins = ['😭', '😫', '😳', '😨'];
const botSkin = '🤖';

const players = {};
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
                newFireX >= 0 &&
                newFireY >= 0 &&
                newFireX < gridSize &&
                newFireY < gridSize
            ) {
                newFires.push({ x: newFireX, y: newFireY });
                Object.keys(players).forEach(playerId => {
                    const player = players[playerId];
                    if (player.position.x === newFireX && player.position.y === newFireY) {
                        io.to(playerId).emit('gameOver', { socketId: playerId });
                        delete players[playerId];
                    }
                });
            }
        });
    });
    return newFires;
};

// Helper function: bounce a position back inside the grid (for normal movement).
function bouncePosition(position, gridSize) {
    let { x, y } = position;
    if (x < 0) {
        x = 1;
    } else if (x >= gridSize) {
        x = gridSize - 2;
    }
    if (y < 0) {
        y = 1;
    } else if (y >= gridSize) {
        y = gridSize - 2;
    }
    return { x, y };
}

// Check if a given cell is already occupied by another player/bot.
function isCellOccupied(cell, exceptId = null) {
    return Object.keys(players).some(pid => {
        if (pid === exceptId) return false;
        const pos = players[pid].position;
        return pos.x === cell.x && pos.y === cell.y;
    });
}

function movePlayer(socket, move) {
    let newPlayerPosition = { ...players[socket.id].position };
    if (typeof move === 'object' && move !== null) {
        newPlayerPosition.x += move.dx;
        newPlayerPosition.y += move.dy;
    } else {
        switch (move) {
            case 'up':
                newPlayerPosition.x = Math.max(0, newPlayerPosition.x - 1);
                break;
            case 'down':
                newPlayerPosition.x = Math.min(gridSize - 1, newPlayerPosition.x + 1);
                break;
            case 'left':
                newPlayerPosition.y = Math.max(0, newPlayerPosition.y - 1);
                break;
            case 'right':
                newPlayerPosition.y = Math.min(gridSize - 1, newPlayerPosition.y + 1);
                break;
            default:
                break;
        }
    }
    newPlayerPosition = bouncePosition(newPlayerPosition, gridSize);
    if (isCellOccupied(newPlayerPosition, socket.id)) {
        console.log(`Move blocked for ${socket.id}: cell occupied`);
        return;
    }
    if (fires.some(fire => fire.x === newPlayerPosition.x && fire.y === newPlayerPosition.y)) {
        socket.emit('gameOver', { socketId: socket.id });
    } else {
        players[socket.id].position = newPlayerPosition;
        players[socket.id].lastDirection = move;
        io.emit('updateState', { players, fires });
    }
}

function findSafeSpawnLocation(gridSize, fires) {
    const maxAttempts = 100;
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        const x = Math.floor(Math.random() * gridSize);
        const y = Math.floor(Math.random() * gridSize);
        const safe = fires.every(fire => {
            const dx = Math.abs(x - fire.x);
            const dy = Math.abs(y - fire.y);
            return dx + dy >= 3;
        });
        // Also ensure no other player occupies that cell.
        if (safe && !isCellOccupied({ x, y })) {
            return { x, y };
        }
    }
    return null;
}

let fireSpreadInterval = null;
const updateFireInterval = () => {
    const playerCount = Object.keys(players).length;
    if (playerCount > 0 && !fireSpreadInterval) {
        fireSpreadInterval = setInterval(() => {
            fires = spreadFire(fires, gridSize);
            io.emit('updateState', { players, fires });
        }, 3000);
    } else if (playerCount === 0 && fireSpreadInterval) {
        clearInterval(fireSpreadInterval);
        fireSpreadInterval = null;
    }
};

// Bot AI: if a human is adjacent (including diagonals), bot punches; otherwise, bot moves toward the nearest human.
const botMoveLogic = (botId) => {
    const bot = players[botId];
    if (!bot) return;
    // Find human players (non-bots)
    const humanIds = Object.keys(players).filter(pid => !players[pid].isBot);
    if (humanIds.length === 0) return;

    // Check if any human is adjacent (including diagonals).
    // Instead of using Manhattan distance === 1, we use max(|dx|,|dy|) === 1.
    for (const humanId of humanIds) {
        const human = players[humanId];
        const diffX = Math.abs(human.position.x - bot.position.x);
        const diffY = Math.abs(human.position.y - bot.position.y);
        if (Math.max(diffX, diffY) === 1) {
            // Compute relative direction (dx, dy)
            const dx = human.position.x - bot.position.x;
            const dy = human.position.y - bot.position.y;
            botPunch(botId, { dx, dy });
            return; // Bot punches this tick.
        }
    }
    // Otherwise, move toward the first human.
    const target = players[humanIds[0]];
    const diffX = target.position.x - bot.position.x;
    const diffY = target.position.y - bot.position.y;
    const stepX = diffX === 0 ? 0 : diffX / Math.abs(diffX);
    const stepY = diffY === 0 ? 0 : diffY / Math.abs(diffY);
    moveBot(botId, { dx: stepX, dy: stepY });
};

// Bot-specific move (no socket)
function moveBot(botId, move) {
    let newPlayerPosition = { ...players[botId].position };
    if (typeof move === 'object' && move !== null) {
        newPlayerPosition.x += move.dx;
        newPlayerPosition.y += move.dy;
    }
    newPlayerPosition = bouncePosition(newPlayerPosition, gridSize);
    if (isCellOccupied(newPlayerPosition, botId)) {
        console.log(`Bot move blocked for ${botId}: cell occupied`);
        return;
    }
    if (fires.some(f => f.x === newPlayerPosition.x && f.y === newPlayerPosition.y)) {
        delete players[botId];
    } else {
        players[botId].position = newPlayerPosition;
        players[botId].lastDirection = move;
    }
    io.emit('updateState', { players, fires });
}

// Bot punch: similar to player punch, but update bot data for the punch visual.
function botPunch(botId, direction) {
    const punchingBot = players[botId];
    const { dx, dy } = direction;
    const targetX = punchingBot.position.x + dx;
    const targetY = punchingBot.position.y + dy;
    // If target is out-of-bounds, penalize the bot.
    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
        let bounceX = punchingBot.position.x - dx * 3;
        let bounceY = punchingBot.position.y - dy * 3;
        bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
        bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
        if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
            delete players[botId];
        } else {
            punchingBot.position.x = bounceX;
            punchingBot.position.y = bounceY;
        }
        io.emit('updateState', { players, fires });
        return;
    }
    // Look for a human in the target cell.
    const punchedPlayerId = Object.keys(players).find(pid => {
        const p = players[pid];
        return !p.isBot && p.position.x === targetX && p.position.y === targetY;
    });
    if (punchedPlayerId) {
        const punchedPlayer = players[punchedPlayerId];
        const proposedX = punchedPlayer.position.x + dx * 3;
        const proposedY = punchedPlayer.position.y + dy * 3;
        if (
            proposedX >= 0 &&
            proposedX < gridSize &&
            proposedY >= 0 &&
            proposedY < gridSize
        ) {
            if (fires.some(f => f.x === proposedX && f.y === proposedY)) {
                io.to(punchedPlayerId).emit('gameOver', { socketId: punchedPlayerId });
                delete players[punchedPlayerId];
            } else {
                punchedPlayer.position.x = proposedX;
                punchedPlayer.position.y = proposedY;
            }
        } else {
            let bounceX = punchedPlayer.position.x - dx * 3;
            let bounceY = punchedPlayer.position.y - dy * 3;
            bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
            bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
            if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
                io.to(punchedPlayerId).emit('gameOver', { socketId: punchedPlayerId });
                delete players[punchedPlayerId];
            } else {
                punchedPlayer.position.x = bounceX;
                punchedPlayer.position.y = bounceY;
            }
        }
    }
    // Set the bot's punch visual flags.
    punchingBot.isPunching = true;
    punchingBot.punchDirection = { dx, dy };
    io.emit('updateState', { players, fires });
    // Clear the punch visual after 100ms.
    setTimeout(() => {
        if (players[botId]) {
            players[botId].isPunching = false;
            players[botId].punchDirection = { dx: 0, dy: 0 };
            io.emit('updateState', { players, fires });
        }
    }, 100);
}

// Spawn bot: creates a bot with id "bot-..." and the 🤖 skin, and sets up periodic movement.
function spawnBot() {
    const botId = "bot-" + Date.now();
    console.log(`Spawn ${botId}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) return;
    players[botId] = { position: spawnLocation, skin: botSkin, isBot: true, lastDirection: { dx: 0, dy: 1 } };
    io.emit('updateState', { players, fires });
    setInterval(() => {
        botMoveLogic(botId);
    }, 250); // Adjust interval as desired.
}

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
    players[socket.id] = { position: spawnLocation, skin, isBot: false, lastDirection: { dx: 0, dy: -1 } };

    updateFireInterval();
    socket.emit('initializeGame', { gridSize });

    socket.on('playerMove', (move) => {
        console.log(`Move event received for player ${socket.id}:`, move);
        movePlayer(socket, move);
        io.emit('updateState', { players, fires });
    });

    socket.on('playerPunch', (punchDir) => {
        const punchingPlayer = players[socket.id];
        let dx = 0, dy = 0;
        if (punchDir && typeof punchDir === 'object') {
            dx = punchDir.dx;
            dy = punchDir.dy;
        } else {
            switch (punchingPlayer.lastDirection) {
                case 'up':
                    dx = -1;
                    break;
                case 'down':
                    dx = 1;
                    break;
                case 'left':
                    dy = -1;
                    break;
                case 'right':
                    dy = 1;
                    break;
                default:
                    break;
            }
        }
        const targetX = punchingPlayer.position.x + dx;
        const targetY = punchingPlayer.position.y + dy;
        if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
            let bounceX = punchingPlayer.position.x - dx * 3;
            let bounceY = punchingPlayer.position.y - dy * 3;
            bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
            bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
            if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
                socket.emit('gameOver', { socketId: socket.id });
                delete players[socket.id];
            } else {
                punchingPlayer.position.x = bounceX;
                punchingPlayer.position.y = bounceY;
            }
        } else {
            const punchedPlayerId = Object.keys(players).find(pid => {
                const p = players[pid];
                return p.position.x === targetX && p.position.y === targetY;
            });
            if (punchedPlayerId) {
                const punchedPlayer = players[punchedPlayerId];
                const proposedX = punchedPlayer.position.x + dx * 3;
                const proposedY = punchedPlayer.position.y + dy * 3;
                if (
                    proposedX >= 0 &&
                    proposedX < gridSize &&
                    proposedY >= 0 &&
                    proposedY < gridSize
                ) {
                    if (fires.some(f => f.x === proposedX && f.y === proposedY)) {
                        io.to(punchedPlayerId).emit('gameOver', { socketId: punchedPlayerId });
                        delete players[punchedPlayerId];
                    } else {
                        punchedPlayer.position.x = proposedX;
                        punchedPlayer.position.y = proposedY;
                    }
                } else {
                    let bounceX = punchedPlayer.position.x - dx * 3;
                    let bounceY = punchedPlayer.position.y - dy * 3;
                    bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
                    bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
                    if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
                        io.to(punchedPlayerId).emit('gameOver', { socketId: punchedPlayerId });
                        delete players[punchedPlayerId];
                    } else {
                        punchedPlayer.position.x = bounceX;
                        punchedPlayer.position.y = bounceY;
                    }
                }
            }
        }
        io.emit('updateState', { players, fires });
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('updateState', { players, fires });
        if (Object.keys(players).length === 0) {
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
    fires = [{ x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) }];
    spawnBot();
}
