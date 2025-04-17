// physicsEngine.js
class PhysicsEngine {
    /**
     * Constructs a PhysicsEngine instance.
     * @param {number} gridSize - The size of the grid.
     * @param {object} players - An object representing the current players keyed by id.
     */
    constructor(gridSize, players) {
        this.gridSize = gridSize;
        this.players = players;
    }

    /**
     * Bounce a position so that it stays inside the grid.
     * @param {object} position - The position to bounce { x, y }.
     * @returns {object} The new position inside grid boundaries.
     */
    bouncePosition(position) {
        let { x, y } = position;
        if (x < 0) {
            x = 1;
        } else if (x >= this.gridSize) {
            x = this.gridSize - 2;
        }
        if (y < 0) {
            y = 1;
        } else if (y >= this.gridSize) {
            y = this.gridSize - 2;
        }
        return { x, y };
    }

    /**
     * Checks if a cell is already occupied by a player.
     * @param {object} cell - The cell to check { x, y }.
     * @param {string|null} exceptId - (Optional) An id to ignore in the check.
     * @returns {boolean} True if the cell is occupied.
     */
    isCellOccupied(cell, exceptId = null) {
        return Object.keys(this.players).some(pid => {
            if (pid === exceptId) return false;
            const pos = this.players[pid].position;
            return pos.x === cell.x && pos.y === cell.y;
        });
    }

    /**
     * Finds a safe spawn location where no fire is too near and the cell is unoccupied.
     * @param {Array<object>} fires - Array of fire cells.
     * @returns {object|null} A valid spawn location { x, y } or null if none found.
     */
    findSafeSpawnLocation(fires) {
        const maxAttempts = 100;
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const safe = fires.every(fire => {
                const dx = Math.abs(x - fire.x);
                const dy = Math.abs(y - fire.y);
                return dx + dy >= 3;
            });
            if (safe && !this.isCellOccupied({ x, y })) {
                return { x, y };
            }
        }
        return null;
    }
}

module.exports = PhysicsEngine;
