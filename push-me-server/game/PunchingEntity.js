// game/PunchingEntity.js
const EventEmitter = require('events');

class PunchingEntity {
    /**
     * @param {string} id
     * @param {{x:number,y:number}} position
     * @param {string} skin
     * @param {object} gameContext  // { players, gridSize, physicsEngine, eventEmitter }
     */
    constructor(id, position, skin, gameContext) {
        this.id = id;
        this.position = position;
        this.skin = skin;
        this.lastDirection = { dx: 0, dy: -1 };
        this.isAlive = true;
        this.isBot = false;
        this.gameContext = gameContext;  // includes physicsEngine & EventEmitter
    }

    /**
     * toJSON stripped of non‑serializable fields for socket.io updates
     */
    toJSON() {
        return {
            id: this.id,
            position: this.position,
            skin: this.skin,
            lastDirection: this.lastDirection,
            isAlive: this.isAlive,
            isBot: this.isBot,
            isPunching: this.isPunching || false,
            punchDirection: this.punchDirection || { dx: 0, dy: 0 }
        };
    }

    /**
     * Shared move logic:
     * 1) compute new position from input
     * 2) bounce off walls
     * 3) prevent occupying same cell
     * 4) handle fire collision (kills player)
     * 5) commit and notify server
     */
    move(move, fires = []) {
        const { players, physicsEngine, eventEmitter } = this.gameContext;
        let newPos = { ...this.position };

        // 1) Direction
        if (move && typeof move.dx === 'number') {
            newPos.x += move.dx;
            newPos.y += move.dy;
        } else {
            switch (move) {
                case 'up':    newPos.x = Math.max(0, newPos.x - 1); break;
                case 'down':  newPos.x = Math.min(physicsEngine.gridSize - 1, newPos.x + 1); break;
                case 'left':  newPos.y = Math.max(0, newPos.y - 1); break;
                case 'right': newPos.y = Math.min(physicsEngine.gridSize - 1, newPos.y + 1); break;
            }
        }

        // 2) Bounce
        newPos = physicsEngine.bouncePosition(newPos);

        // 3) Occupancy
        if (physicsEngine.isCellOccupied(newPos, this.id)) {
            console.log(`Move blocked for ${this.id}`);
            return;
        }

        // 4) Fire collision
        if (fires.some(f => f.x === newPos.x && f.y === newPos.y)) {
            if (!this.isBot && this.isAlive) {
                this.isAlive = false;
                eventEmitter.emit('playerDied', this.id);
            }
            eventEmitter.emit('entityUpdated', this.id);
            return;
        }

        // 5) Commit
        this.position = newPos;
        if (move && typeof move.dx === 'number') this.lastDirection = move;
        players[this.id].position = newPos;
        players[this.id].lastDirection = this.lastDirection;
        eventEmitter.emit('entityUpdated', this.id);
    }

    /**
     * Shared punch logic:
     * - Ghosts extinguish fires
     * - Normal entities knock back either themselves or victims
     */
    punch(dir, fires = []) {
        const { players, physicsEngine, eventEmitter } = this.gameContext;
        const gameMode = fires.length > 0;

        // Determine punch vector
        const vec = (dir && typeof dir.dx === 'number') ? dir : this.lastDirection;
        const tx = this.position.x + vec.dx;
        const ty = this.position.y + vec.dy;

        // --- Ghost Mode: extinguish fires ---
        if (!this.isAlive && gameMode) {
            const idx = fires.findIndex(f => f.x === tx && f.y === ty);
            if (idx !== -1) {
                // remove fire locally
                fires.splice(idx, 1);
                // notify FireManager
                eventEmitter.emit('extinguishFire', { x: tx, y: ty });
            }
            eventEmitter.emit('entityUpdated', this.id);
            return;
        }

        // --- Self‑Knockback: attacker hits wall ---
        if (tx < 0 || tx >= physicsEngine.gridSize || ty < 0 || ty >= physicsEngine.gridSize) {
            const { position, died } = physicsEngine.computeSelfKnockback(
                this.position, vec, fires
            );
            this.position = position;
            if (died && this.isAlive) {
                this.isAlive = false;
                eventEmitter.emit('playerDied', this.id);
            }
            players[this.id].position = position;
            eventEmitter.emit('entityUpdated', this.id);
            return;
        }

        // --- Victim‑Knockback: attacker hits another entity ---
        const victimId = Object.keys(players).find(pid =>
            players[pid].position.x === tx && players[pid].position.y === ty
        );
        if (victimId) {
            const victim = players[victimId];
            const { position, died } = physicsEngine.computeVictimKnockback(
                victim.position, vec, fires
            );
            if (died && victim.isAlive) {
                victim.isAlive = false;
                eventEmitter.emit('playerDied', victimId);
            } else {
                victim.position = position;
            }
            eventEmitter.emit('entityUpdated', victimId);
        }

        // --- Punch animation ---
        players[this.id].isPunching = true;
        players[this.id].punchDirection = vec;
        eventEmitter.emit('entityUpdated', this.id);

        setTimeout(() => {
            if (players[this.id]) {
                players[this.id].isPunching = false;
                players[this.id].punchDirection = { dx: 0, dy: 0 };
                eventEmitter.emit('entityUpdated', this.id);
            }
        }, 100);
    }
}

module.exports = PunchingEntity;
