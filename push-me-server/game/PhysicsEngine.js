// physics/PhysicsEngine.js

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
     * @param {{x:number,y:number}} pos
     * @returns {{x:number,y:number}}
     */
    bouncePosition(pos) {
        let { x, y } = pos;
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
     * @param {{x:number,y:number}} cell
     * @param {string|null} exceptId - (Optional) An id to ignore in the check.
     * @returns {boolean}
     */
    isCellOccupied(cell, exceptId = null) {
        return Object.keys(this.players).some(pid =>
            pid !== exceptId &&
            this.players[pid].position.x === cell.x &&
            this.players[pid].position.y === cell.y
        );
    }

    /**
     * Finds a safe spawn location far from any fire and unoccupied.
     * @param {Array<{x:number,y:number}>} fires
     * @returns {{x:number,y:number}|null}
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

    /**
     * Compute knockback when attacker hits a wall:
     *  - push back by 3 cells opposite direction
     *  - clamp inside grid
     *  - if lands on fire → died
     * @param {{x:number,y:number}} startPos
     * @param {{dx:number,dy:number}} dir
     * @param {Array<{x:number,y:number}>} fires
     * @returns {{position:{x:number,y:number},died:boolean}}
     */
    computeSelfKnockback(startPos, dir, fires) {
        const { dx, dy } = dir;
        let tx = startPos.x - dx * 3;
        let ty = startPos.y - dy * 3;

        // clamp inside bounds
        tx = Math.max(0, Math.min(this.gridSize - 1, tx));
        ty = Math.max(0, Math.min(this.gridSize - 1, ty));

        // died if landing in fire
        const died = fires.some(f => f.x === tx && f.y === ty);
        return { position: { x: tx, y: ty }, died };
    }

    /**
     * Compute knockback for a victim:
     *  - push forward by 3 cells in punch direction
     *  - if out-of-bounds, bounce back opposite
     *  - clamp inside grid
     *  - if lands on fire → died
     * @param {{x:number,y:number}} startPos
     * @param {{dx:number,dy:number}} dir
     * @param {Array<{x:number,y:number}>} fires
     * @returns {{position:{x:number,y:number},died:boolean}}
     */
    computeVictimKnockback(startPos, dir, fires) {
        const { dx, dy } = dir;
        let tx = startPos.x + dx * 3;
        let ty = startPos.y + dy * 3;

        // bounce back if out of bounds
        if (tx < 0 || tx >= this.gridSize || ty < 0 || ty >= this.gridSize) {
            tx = startPos.x - dx * 3;
            ty = startPos.y - dy * 3;
        }

        // clamp inside
        tx = Math.max(0, Math.min(this.gridSize - 1, tx));
        ty = Math.max(0, Math.min(this.gridSize - 1, ty));

        // died if landing in fire
        const died = fires.some(f => f.x === tx && f.y === ty);
        return { position: { x: tx, y: ty }, died };
    }
}

module.exports = PhysicsEngine;
