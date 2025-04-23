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
        this.id            = id;
        this.position      = position;
        this.skin          = skin;
        this.lastDirection = { dx: 0, dy: -1 };
        this.isAlive       = true;
        this.isBot         = false;
        this.isKnockedBack = false;
        this.gameContext   = gameContext;
    }

    toJSON() {
        return {
            id,
            position:       this.position,
            skin:           this.skin,
            lastDirection:  this.lastDirection,
            isAlive:        this.isAlive,
            isBot:          this.isBot,
            isPunching:     this.isPunching  || false,
            punchDirection: this.punchDirection || { dx: 0, dy: 0 },
            isKnockedBack:  this.isKnockedBack
        };
    }

    /**
     * Move in the given direction (or repeat lastDirection).
     * Always delegates to the cell for collision/bounce.
     */
    move(dir) {
        const { physicsEngine, eventEmitter } = this.gameContext;

        // pick a vector
        const vec = (dir && typeof dir.dx === 'number')
            ? dir
            : this.lastDirection;

        const tx = this.position.x + vec.dx;
        const ty = this.position.y + vec.dy;

        // block if another live player is there
        const other = physicsEngine.getEntityAt({ x: tx, y: ty });
        if (other && other.id !== this.id) return;

        // delegate to the target cell (Empty, Fire, or Wall)
        const cell = physicsEngine.getCell({ x: tx, y: ty });
        cell.movedInto(this, vec);
    }

    /**
     * Punch in a direction (or lastDirection):
     *  1) let the cell react (knockback/extinguish)
     *  2) let any victim react (only if alive)
     *  3) animate
     */
    punch(dir) {
        const { physicsEngine, eventEmitter } = this.gameContext;
        const vec = (dir && typeof dir.dx === 'number')
            ? dir
            : this.lastDirection;

        // 1) cell reaction (e.g. bounce off walls, extinguish fire)
        const cell = physicsEngine.getCell({
            x: this.position.x + vec.dx,
            y: this.position.y + vec.dy
        });
        cell.punchedBy(this, vec);

        // 2) entity reaction (only if this attacker entity is alive)
        if (this.isAlive) {
            const victim = physicsEngine.getEntityAt({
                x: this.position.x + vec.dx,
                y: this.position.y + vec.dy
            });
            if (victim) victim.punchedBy(vec);
        }

        // 3) punch animation on self
        this.lastDirection   = vec;
        this.isPunching      = true;
        this.punchDirection  = vec;
        eventEmitter.emit('entityUpdated', this.id);

        setTimeout(() => {
            if (physicsEngine.players[this.id]) {
                this.isPunching     = false;
                this.punchDirection = { dx: 0, dy: 0 };
                eventEmitter.emit('entityUpdated', this.id);
            }
        }, 100);
    }

    /**
     * Knockback when *you* get punched by someone else.
     */
    punchedBy(vec) {
        const { physicsEngine, eventEmitter } = this.gameContext;

        // start knockback animation
        this.isKnockedBack = true;
        eventEmitter.emit('entityUpdated', this.id);

        // compute bounce / death
        const { position: newPos, died } =
            physicsEngine.computeVictimKnockback(this.position, vec);

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
