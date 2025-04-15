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

// Grid configuration
const gridSize = 25;

// Define available skins for human players and the bot skin.
const availableSkins = ['😭', '😫', '😳', '😨'];
const botSkin = '🤖';

// Place the fire in the exact middle cell and surround it

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

// Store connected players (humans and bot).
const players = {};

// Utility: keeps positions inside the grid.
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

// Check whether a given cell is occupied.
function isCellOccupied(cell, exceptId = null) {
    return Object.keys(players).some(pid => {
        if (pid === exceptId) return false;
        const pos = players[pid].position;
        return pos.x === cell.x && pos.y === cell.y;
    });
}

// Finds a safe spawn location that is at least 3 steps away from the fire and unoccupied.
function findSafeSpawnLocation(gridSize, fires) {
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
        const x = Math.floor(Math.random() * gridSize);
        const y = Math.floor(Math.random() * gridSize);
        const safe = fires.every(fire => {
            const dx = Math.abs(x - fire.x);
            const dy = Math.abs(y - fire.y);
            return dx + dy >= 3;
        });
        if (safe && !isCellOccupied({ x, y })) {
            return { x, y };
        }
    }
    return null;
}

// When a human player moves, if they step onto the fire cell, respawn them at a safe location.
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

    // If the new position is on fire, respawn at a safe location.
    if (fires.some(f => f.x === newPlayerPosition.x && f.y === newPlayerPosition.y)) {
        const safeLocation = findSafeSpawnLocation(gridSize, fires);
        if (safeLocation) {
            players[socket.id].position = safeLocation;
            console.log(`Player ${socket.id} hit fire and respawned`);
        } else {
            console.log(`No safe spawn available for player ${socket.id}`);
        }
    } else {
        players[socket.id].position = newPlayerPosition;
        players[socket.id].lastDirection = move;
    }
    io.emit('updateState', { players, fires });
}

// When a bot moves, if it lands on fire, respawn it.
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
        const safeLocation = findSafeSpawnLocation(gridSize, fires);
        if (safeLocation) {
            players[botId].position = safeLocation;
            console.log(`Bot ${botId} hit fire and respawned`);
        } else {
            console.log(`No safe spawn available for bot ${botId}`);
        }
    } else {
        players[botId].position = newPlayerPosition;
        players[botId].lastDirection = move;
    }
    io.emit('updateState', { players, fires });
}

// Bot AI logic: move toward a nearby human or punch if adjacent.
const botMoveLogic = (botId) => {
    const bot = players[botId];
    if (!bot) return;
    // We care only if at least one human is present.
    const humanIds = Object.keys(players).filter(pid => !players[pid].isBot);
    if (humanIds.length === 0) return;

    // Punch if a human is immediately adjacent.
    for (const humanId of humanIds) {
        const human = players[humanId];
        const diffX = Math.abs(human.position.x - bot.position.x);
        const diffY = Math.abs(human.position.y - bot.position.y);
        if (Math.max(diffX, diffY) === 1) {
            botPunch(botId, {
                dx: human.position.x - bot.position.x,
                dy: human.position.y - bot.position.y,
            });
            return;
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

// If a bot punch pushes someone onto a fire, respawn them.
function botPunch(botId, direction) {
    const punchingBot = players[botId];
    const { dx, dy } = direction;
    const targetX = punchingBot.position.x + dx;
    const targetY = punchingBot.position.y + dy;

    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
        let bounceX = punchingBot.position.x - dx * 3;
        let bounceY = punchingBot.position.y - dy * 3;
        bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
        bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
        if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
            const safe = findSafeSpawnLocation(gridSize, fires);
            if (safe) {
                players[botId].position = safe;
                console.log(`Bot ${botId} hit fire on bounce and respawned`);
            }
        } else {
            punchingBot.position.x = bounceX;
            punchingBot.position.y = bounceY;
        }
        io.emit('updateState', { players, fires });
        return;
    }

    const punchedPlayerId = Object.keys(players).find(pid => {
        const p = players[pid];
        return !p.isBot && p.position.x === targetX && p.position.y === targetY;
    });

    if (punchedPlayerId) {
        const punchedPlayer = players[punchedPlayerId];
        const proposedX = punchedPlayer.position.x + dx * 3;
        const proposedY = punchedPlayer.position.y + dy * 3;
        if (proposedX >= 0 && proposedX < gridSize && proposedY >= 0 && proposedY < gridSize) {
            if (fires.some(f => f.x === proposedX && f.y === proposedY)) {
                const safe = findSafeSpawnLocation(gridSize, fires);
                if (safe) {
                    punchedPlayer.position = safe;
                    console.log(`Player ${punchedPlayerId} hit fire due to bot punch and respawned`);
                }
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
                const safe = findSafeSpawnLocation(gridSize, fires);
                if (safe) {
                    punchedPlayer.position = safe;
                    console.log(`Player ${punchedPlayerId} hit fire on bounce due to bot punch and respawned`);
                }
            } else {
                punchedPlayer.position.x = bounceX;
                punchedPlayer.position.y = bounceY;
            }
        }
    }

    punchingBot.isPunching = true;
    punchingBot.punchDirection = { dx, dy };
    io.emit('updateState', { players, fires });

    setTimeout(() => {
        if (players[botId]) {
            players[botId].isPunching = false;
            players[botId].punchDirection = { dx: 0, dy: 0 };
            io.emit('updateState', { players, fires });
        }
    }, 100);
}

// Spawn a single bot at a safe location. The bot is intended to be the first element.
function spawnBot() {
    const botId = "bot-" + Date.now();
    console.log(`Spawning bot: ${botId}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) return;
    players[botId] = {
        position: spawnLocation,
        skin: botSkin,
        isBot: true,
        lastDirection: { dx: 0, dy: 1 },
    };
    io.emit('updateState', { players, fires });
    // Start the bot's AI.
    setInterval(() => {
        botMoveLogic(botId);
    }, 250);
}

// Handle player connections and game events.
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) {
        console.log(`No safe spawn for player: ${socket.id}. Disconnecting.`);
        socket.emit('noSafeSpawn');
        socket.disconnect(true);
        return;
    }

    // Choose an available skin.
    const usedSkins = Object.values(players)
        .filter(p => !p.isBot)
        .map(p => p.skin);
    const skin = availableSkins.find(s => !usedSkins.includes(s)) || availableSkins[0];
    players[socket.id] = {
        position: spawnLocation,
        skin,
        isBot: false,
        lastDirection: { dx: 0, dy: -1 },
    };

    socket.emit('initializeGame', { gridSize });

    // Spawn a bot if no bot exists and only and at least one human is connected
    // The lobby always has a bot no matter how many active players
    {
        const keys = Object.keys(players);
        const hasBot = keys.some(pid => players[pid].isBot);
        const effectiveHumanCount = hasBot ? keys.length - 1 : keys.length;
        if (effectiveHumanCount >= 1 && !hasBot) {
            spawnBot();
        }
    }

    socket.emit('updateState', { players, fires });

    socket.on('playerMove', (move) => {
        console.log(`Move event from ${socket.id}:`, move);
        movePlayer(socket, move);
    });

    socket.on('playerPunch', (punchDir) => {
        const punchingPlayer = players[socket.id];
        let dx = 0, dy = 0;
        if (punchDir && typeof punchDir === 'object') {
            dx = punchDir.dx;
            dy = punchDir.dy;
        } else {
            // Use the player's last direction.
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
                const safe = findSafeSpawnLocation(gridSize, fires);
                if (safe) {
                    players[socket.id].position = safe;
                    console.log(`Player ${socket.id} hit fire during punch bounce and respawned`);
                }
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
                if (proposedX >= 0 && proposedX < gridSize && proposedY >= 0 && proposedY < gridSize) {
                    if (fires.some(f => f.x === proposedX && f.y === proposedY)) {
                        const safe = findSafeSpawnLocation(gridSize, fires);
                        if (safe) {
                            punchedPlayer.position = safe;
                            console.log(`Player ${punchedPlayerId} hit fire due to punch and respawned`);
                        }
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
                        const safe = findSafeSpawnLocation(gridSize, fires);
                        if (safe) {
                            punchedPlayer.position = safe;
                            console.log(`Player ${punchedPlayerId} hit fire on punch bounce and respawned`);
                        }
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

        // Compute the effective number of human players.
        const keys = Object.keys(players);
        let humanPlayers = keys.length;
        if (keys.length > 0 && players[keys[0]].isBot) {
            humanPlayers = keys.length - 1;
        }

        // Reset the grid if there are no human players.
        if (humanPlayers === 0) {
            resetGrid();
        }
    });
});

// Reset the grid: clear all players, reset the fire, and spawn one bot.
function resetGrid() {
    console.log("Resetting grid...");
    // Clear all players (clearing the bot as well)
    Object.keys(players).forEach(pid => delete players[pid]);
    spawnBot();
    io.emit('updateState', { players, fires });
}

server.listen(3001, () => {
    console.log("Lobby server running on port 3001");
});
