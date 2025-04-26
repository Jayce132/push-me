// game/PunchingEntity.js
const EventEmitter = require('events');

class PunchingEntity {
    /**
     * @param {string} id
     * @param {{x:number,y:number}} position
     * @param {string} skin
     * @param {{ physicsEngine: PhysicsEngine, eventEmitter: EventEmitter }} gameContext
     */
    constructor(id, position, skin, gameContext) {
        this.id = id;
        this.position = position;
        this.skin = skin;
        this.lastDirection = {dx: 0, dy: -1};
        this.isAlive = true;
        this.isBot = false;
        this.isKnockedBack = false;
        this.gameContext = gameContext;
        // track how many cells we've moved since the last punch
        this.stepsSincePunch = 0;
    }

    /**
     * Can I enter the cell (tx,ty)?
     * - Ghosts (isAlive===false) ignore other entities
     * - Living players only block on other *living* players
     */
    canEnter(tx, ty) {
        const {physicsEngine} = this.gameContext;
        const other = physicsEngine.getEntityAt({x: tx, y: ty});

        // ghosts phase through everybody
        if (!this.isAlive) return true;

        // living players block only on other living players
        if (!other || other.id === this.id || !other.isAlive) {
            return true;
        }

        return false;
    }

    /**
     * Default move: if canEnter, hand off to the cell for
     * walls/fire/empty behavior.
     */
    move(dir) {
        const {physicsEngine} = this.gameContext;

        // pick vector or default
        const vec = (dir && typeof dir.dx === 'number') ? dir : this.lastDirection;
        const tx = this.position.x + vec.dx;
        const ty = this.position.y + vec.dy;

        // entity-blocking check
        if (!this.canEnter(tx, ty)) return;

        // then let the cell handle bounce/extinguish/etc.
        const cell = physicsEngine.getCell({x: tx, y: ty});
        // remember old pos, then let the cell handle movement
        const oldX = this.position.x, oldY = this.position.y;
        cell.movedInto(this, vec);
        // if our position actually changed, count a step
        if (this.position.x !== oldX || this.position.y !== oldY) {
            this.stepsSincePunch++;
        }
    }

    /**
     +     * How strong your next punch will be:
     +     *   base 3 + 1 per 6 steps moved (capped at +3)
     +     */
    getCurrentPunchPower() {
        const bonus = Math.min(Math.floor(this.stepsSincePunch / 6), 3);
        return 3 + bonus;
    }

    /**
     * Punch in a direction (or lastDirection):
     *  1) let the cell react (knockback/extinguish)
     *  2) let any victim react (only if alive)
     *  3) animate
     */
    punch(dir) {
        const {physicsEngine, eventEmitter} = this.gameContext;
        const vec = (dir && typeof dir.dx === 'number')
            ? dir
            : this.lastDirection;

        // compute power via steps‐based helper, then reset step counter
        const power = this.getCurrentPunchPower();
        this.stepsSincePunch = 0;

        // remember where _you_ are aiming BEFORE you bounce yourself
        const originX = this.position.x;
        const originY = this.position.y;

        // 1) cell reaction (now with variable power)
        const cell = physicsEngine.getCell({
            x: this.position.x + vec.dx,
            y: this.position.y + vec.dy
        });
        // only walls use variable power for now
        cell.punchedBy(this, vec, power);

        // 2) entity reaction (only if this attacker entity is alive)
        if (this.isAlive) {
            const victim = physicsEngine.getEntityAt({
                x: originX + vec.dx,
                y: originY + vec.dy
            });
            if (victim) victim.punchedBy(vec, power);
        }

        // 3) punch animation on self
        this.lastDirection = vec;
        this.isPunching = true;
        this.punchDirection = vec;
        eventEmitter.emit('entityUpdated', this.id);

        setTimeout(() => {
            if (physicsEngine.players[this.id]) {
                this.isPunching = false;
                this.punchDirection = {dx: 0, dy: 0};
                eventEmitter.emit('entityUpdated', this.id);
            }
        }, 100);
    }

    /**
     * Knockback when *you* get punched by someone else.
     * @param {{dx:number,dy:number}} vec
     * @param {number} [power=3]  how many cells to knock back
     */
    punchedBy(vec, power = 3) {
        const {physicsEngine, eventEmitter} = this.gameContext;

        // start knockback animation
        this.isKnockedBack = true;
        eventEmitter.emit('entityUpdated', this.id);

        // compute bounce / death
        const {position: newPos, died} =
            physicsEngine.computeVictimKnockback(this.position, vec, power);

        // — kill anyone you land on… only if *you* are alive —
        if (this.isAlive) {
            const bumped = physicsEngine.getEntityAt(newPos);
            if (bumped && bumped.id !== this.id) bumped.die();
        }

        // move there
        this.position = newPos;
        eventEmitter.emit('entityUpdated', this.id);

        // if died, mark dead
        if (died) this.die();

        // clear knockback flag
        setTimeout(() => {
            if (physicsEngine.players[this.id]) {
                this.isKnockedBack = false;
                eventEmitter.emit('entityUpdated', this.id);
            }
        }, 100);
    }

    /**
     * Mark this entity dead.
     */
    die() {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.gameContext.eventEmitter.emit('playerDied', this.id);
    }
}

module.exports = PunchingEntity;
