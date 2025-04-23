// game/PhysicsEngine.js

const EmptyCell = require("./EmptyCell");
const Fire      = require("./Fire");
const Wall      = require("./Wall");

class PhysicsEngine {
    /**
     * @param {number} gridSize
     * @param {Object<string,PunchingEntity>} players
     * @param {FireManager|null} fireManager
     */
    constructor(gridSize, players, fireManager = null) {
        this.gridSize   = gridSize;
        this.players    = players;
        this.fireManager = fireManager;
    }

    /**
     * Keep a position inside [0..gridSize-1], bouncing off edges.
     * @param {{x:number,y:number}} pos
     * @returns {{x:number,y:number}}
     */
    bouncePosition(pos) {
        let { x, y } = pos;
        if (x < 0)         x = 1;
        else if (x >= this.gridSize) x = this.gridSize - 2;
        if (y < 0)         y = 1;
        else if (y >= this.gridSize) y = this.gridSize - 2;
        return { x, y };
    }

    /**
     * Is there a (live) player at `cell` other than `exceptId`?
     * @param {{x:number,y:number}} cell
     * @param {string|null} exceptId
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
     * Find a random spawn spot at least 3 Manhattan away from any fire.
     * @param {Array<{x:number,y:number}>} fires
     * @returns {{x:number,y:number}|null}
     */
    findSafeSpawnLocation(fires) {
        const maxAttempts = 100;
        for (let i = 0; i < maxAttempts; i++) {
            const x = Math.floor(Math.random() * this.gridSize);
            const y = Math.floor(Math.random() * this.gridSize);
            const safe = fires.every(f => Math.abs(x - f.x) + Math.abs(y - f.y) >= 3);
            if (safe && !this.isCellOccupied({ x, y })) {
                return { x, y };
            }
        }
        return null;
    }

    /**
     * When you punch a wall, you knock yourself back.
     * @param {{x:number,y:number}} startPos
     * @param {{dx:number,dy:number}} dir
     * @returns {{position:{x:number,y:number},died:boolean}}
     */
    computeSelfKnockback(startPos, dir) {
        // get current fires
        const fires = this.fireManager ? this.fireManager.getFires() : [];
        const { dx, dy } = dir;
        let tx = startPos.x - dx * 3;
        let ty = startPos.y - dy * 3;

        tx = Math.max(0, Math.min(this.gridSize - 1, tx));
        ty = Math.max(0, Math.min(this.gridSize - 1, ty));

        const died = fires.some(f => f.x === tx && f.y === ty);
        return { position: { x: tx, y: ty }, died };
    }

    /**
     * When another entity punches you, you get knocked forward (or bounce back).
     * @param {{x:number,y:number}} startPos
     * @param {{dx:number,dy:number}} dir
     * @returns {{position:{x:number,y:number},died:boolean}}
     */
    computeVictimKnockback(startPos, dir) {
        const fires = this.fireManager ? this.fireManager.getFires() : [];
        const { dx, dy } = dir;
        let tx = startPos.x + dx * 3;
        let ty = startPos.y + dy * 3;

        // if out‐of‐bounds, bounce back instead
        if (tx < 0 || tx >= this.gridSize || ty < 0 || ty >= this.gridSize) {
            tx = startPos.x - dx * 3;
            ty = startPos.y - dy * 3;
        }

        tx = Math.max(0, Math.min(this.gridSize - 1, tx));
        ty = Math.max(0, Math.min(this.gridSize - 1, ty));

        const died = fires.some(f => f.x === tx && f.y === ty);
        return { position: { x: tx, y: ty }, died };
    }

    /**
     * Find a player entity at these coords, or null.
     * @param {{x:number,y:number}} pos
     */
    getEntityAt({ x, y }) {
        return Object.values(this.players).find(p =>
            p.position.x === x && p.position.y === y
        ) || null;
    }

    /**
     * Return the correct Cell object at (x,y):
     * - Wall if out‐of‐bounds
     * - Fire if fireManager says there’s a flame
     * - otherwise an EmptyCell
     */
    getCell({ x, y }) {
        if (x < 0 || y < 0 || x >= this.gridSize || y >= this.gridSize) {
            return new Wall({ x, y }, this);
        }

        if (
            this.fireManager &&
            this.fireManager.getFires().some(f => f.x === x && f.y === y)
        ) {
            return new Fire({ x, y }, this.gridSize, this.players, this.fireManager.eventEmitter);
        }

        return new EmptyCell({ x, y }, this);
    }
}

module.exports = PhysicsEngine;
