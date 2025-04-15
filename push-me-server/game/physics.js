// game/physics.js
const { players } = require('./constants');

// Helper function: bounce a position back inside the grid.
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

// Check if a given cell is already occupied.
function isCellOccupied(cell, exceptId = null) {
    return Object.keys(players).some(pid => {
        if (pid === exceptId) return false;
        const pos = players[pid].position;
        return pos.x === cell.x && pos.y === cell.y;
    });
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
        if (safe && !isCellOccupied({ x, y })) {
            return { x, y };
        }
    }
    return null;
}
module.exports = { bouncePosition, isCellOccupied, findSafeSpawnLocation };
