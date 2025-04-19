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
        this.gameContext = gameContext;  // includes physicsEngine & eventEmitter
    }

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

    move(move, fires = []) {
        const { players, physicsEngine } = this.gameContext;
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
            // stepped into fire ⇒ die()
            if (!this.isBot && this.isAlive) {
                this.die();
            }
            return;
        }

        // 5) Commit
        this.position = newPos;
        if (move && typeof move.dx === 'number') this.lastDirection = move;
        players[this.id].position = newPos;
        players[this.id].lastDirection = this.lastDirection;
        this.gameContext.eventEmitter.emit('entityUpdated', this.id);
    }


    punch(dir, fires = []) {
        const { players, physicsEngine, eventEmitter } = this.gameContext;
        const gameMode = fires.length > 0;

        // Determine direction vector
        const vec = (dir && typeof dir.dx === 'number') ? dir : this.lastDirection;
        const tx = this.position.x + vec.dx;
        const ty = this.position.y + vec.dy;

        // Ghost extinguish logic
        if (!this.isAlive && gameMode) {
            const idx = fires.findIndex(f => f.x === tx && f.y === ty);
            if (idx !== -1) {
                fires.splice(idx, 1);
                eventEmitter.emit('extinguishFire', { x: tx, y: ty });
            }
            eventEmitter.emit('entityUpdated', this.id);
            return;
        }

        // Self‑knockback: attacker hits wall
        if (tx < 0 || tx >= physicsEngine.gridSize || ty < 0 || ty >= physicsEngine.gridSize) {
            // computeSelfKnockback still lives here
            const { position, died } = physicsEngine.computeSelfKnockback(
                this.position, vec, fires
            );
            this.position = position;
            if (died) this.die();
            players[this.id].position = position;
            eventEmitter.emit('entityUpdated', this.id);
            return;
        }

        // Victim‑knockback: delegate to the punched entity
        const victimId = Object.keys(players).find(pid =>
            players[pid].position.x === tx && players[pid].position.y === ty
        );
        if (victimId) {
            const victimEntity = players[victimId];
            victimEntity.punchedBy(vec, fires);
        }

        // Punch animation (unchanged)
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

    /**
     * Handle being punched by another entity (victim-knockback).
     * Calculates its own knockback, updates position or dies.
     * @param {{dx:number,dy:number}} vec
     * @param {Array<{x:number,y:number}>} fires
     */
    punchedBy(vec, fires = []) {
        const { physicsEngine, players, eventEmitter } = this.gameContext;
        const { position, died } = physicsEngine.computeVictimKnockback(
            this.position, vec, fires
        );

        if (died) {
            this.die();
        } else {
            this.position = position;
            players[this.id].position = position;
            eventEmitter.emit('entityUpdated', this.id);
        }
    }

    /**
     * Central death logic: flip alive flag and emit death event.
     */
    die() {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.gameContext.eventEmitter.emit('playerDied', this.id);
    }
}

module.exports = PunchingEntity;
