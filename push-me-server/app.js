const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
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

const players = {};
let fires = [{x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize)}];

const spreadFire = () => {
    console.log("Fire is spreading...")
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
                newFires.push({x: newFireX, y: newFireY});

                Object.keys(players).forEach(playerId => {
                    const player = players[playerId];
                    if (player.position.x === newFireX && player.position.y === newFireY) {
                        io.to(playerId).emit('gameOver', {socketId: playerId});
                        delete players[playerId];
                    }
                });
            }
        });
    });

    return newFires;
};

function movePlayer(socket, direction) {
    let newPlayerPosition = {...players[socket.id].position};
    switch (direction) {
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

    if (fires.some(fire => fire.x === newPlayerPosition.x && fire.y === newPlayerPosition.y)) {
        socket.emit('gameOver', {socketId: socket.id});
    } else {
        players[socket.id].position = newPlayerPosition;
        players[socket.id].lastDirection = direction;
        io.emit('updateState', {players, fires}); // Removed ghosts from the emission data
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
            return {x, y};
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
            io.emit('updateState', {players, fires}); // Removed ghosts from the emission data
        }, 3000);
    } else if (playerCount === 0 && fireSpreadInterval) {
        clearInterval(fireSpreadInterval);
        fireSpreadInterval = null;
    }
};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Initialize player
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);  // Use the safe spawn function here

    if (!spawnLocation) {
        console.log(`No safe spawn for player: ${socket.id}. Disconnecting.`);
        socket.emit('noSafeSpawn');
        socket.disconnect(true);
        return;
    }

    players[socket.id] = {
        position: spawnLocation
    };

    // Update fire interval when a player connects
    updateFireInterval();

    // Send the grid size to the client
    socket.emit('initializeGame', {gridSize});

    socket.on('playerMove', (data) => {
        console.log(`Move event received for player ${socket.id}, moving ${data.direction}`);
        movePlayer(socket, data.direction);
        socket.emit('updateState', {playerId: socket.id, players, fires});
    });

    socket.on('playerPunch', () => {
        const punchingPlayer = players[socket.id];
        let dx = 0, dy = 0;
        switch (punchingPlayer.lastDirection) { // Assuming you're tracking lastDirection on server
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

        const punchX = punchingPlayer.position.x + dx;
        const punchY = punchingPlayer.position.y + dy;

        // Check if another player is in the punched position
        const punchedPlayerId = Object.keys(players).find(pid => {
            const p = players[pid];
            return p.position.x === punchX && p.position.y === punchY;
        });

        // If another player is punched
        if (punchedPlayerId) {
            const punchedPlayer = players[punchedPlayerId];

            // Calculate new position after being punched
            let newPunchedPosX = punchedPlayer.position.x;
            let newPunchedPosY = punchedPlayer.position.y;

            // Check for fire at each step and break if found
            for (let i = 0; i < 3; i++) {
                newPunchedPosX += dx;
                newPunchedPosY += dy;

                // Check if the new position is valid (inside grid, not on fire, etc.)
                const isValidPosition = (
                    newPunchedPosX >= 0 && newPunchedPosX < gridSize &&
                    newPunchedPosY >= 0 && newPunchedPosY < gridSize &&
                    !fires.some(f => f.x === newPunchedPosX && f.y === newPunchedPosY)
                );

                if (isValidPosition) {
                    punchedPlayer.position.x = newPunchedPosX;
                    punchedPlayer.position.y = newPunchedPosY;
                } else {
                    // If player is being punched into fire or outside the grid
                    io.to(punchedPlayerId).emit('gameOver', {socketId: punchedPlayerId});
                    delete players[punchedPlayerId];
                    break;
                }
            }
        }

        // Broadcast the new game state to all clients
        io.emit('updateState', {players, fires});
    });

    // Initialize or reset the grid to default state
    const resetGrid = () => {
        console.log("Grid reset..")
        fires = [{x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize)}];
    };

    // When a socket disconnects
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        // Send general update to all sockets
        io.emit('updateState', {players, fires});

        // If no players are left, reset the grid
        if (Object.keys(players).length === 0) {
            console.log(Object.keys(players));
            resetGrid();
            // Update intervals when a player disconnects
            updateFireInterval();
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
