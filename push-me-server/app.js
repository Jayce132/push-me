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

// Define available skins
const availableSkins = ['😭', '😫', '😳', '😨'];
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

    // Bounce for normal movement.
    newPlayerPosition = bouncePosition(newPlayerPosition, gridSize);

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

        if (safe) {
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

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) {
        console.log(`No safe spawn for player: ${socket.id}. Disconnecting.`);
        socket.emit('noSafeSpawn');
        socket.disconnect(true);
        return;
    }

    // Assign a skin from availableSkins that is not already used.
    const usedSkins = Object.values(players).map(p => p.skin);
    const skin = availableSkins.find(s => !usedSkins.includes(s)) || availableSkins[0];
    players[socket.id] = { position: spawnLocation, skin };

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

        // Determine the target cell (1 cell ahead)
        const targetX = punchingPlayer.position.x + dx;
        const targetY = punchingPlayer.position.y + dy;

        // Case 1: Target cell is outside the grid (i.e. punching the border wall)
        if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
            // Penalize: bounce the punching player back 3 cells in opposite direction.
            let bounceX = punchingPlayer.position.x - dx * 3;
            let bounceY = punchingPlayer.position.y - dy * 3;
            // Clamp the bounce position
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
            // The target cell is within the grid.
            const punchedPlayerId = Object.keys(players).find(pid => {
                const p = players[pid];
                return p.position.x === targetX && p.position.y === targetY;
            });

            if (punchedPlayerId) {
                // Case 2: Enemy found at target.
                const punchedPlayer = players[punchedPlayerId];
                // Proposed final position: move 3 cells forward.
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
                    // Proposed enemy position is out-of-bounds (enemy pushed into border).
                    // Bounce enemy back 3 cells in opposite direction.
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
}
