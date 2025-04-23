const EventEmitter = require('events');
const Fire         = require('./Fire');       // to detect fire cells

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
            id:             this.id,
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

        // find the target cell
        const cell = physicsEngine.getCell({ x: tx, y: ty });

        // if I'm a ghost, let me pass through fires
        if (!this.isAlive && cell instanceof Fire) {
            this.position = { x: tx, y: ty };
            eventEmitter.emit('entityUpdated', this.id);
            return;
        }

        // otherwise delegate to whatever cell it is
        cell.movedInto(this, vec);
    }

    /**
     * Punch in a direction (or lastDirection):
     *  1) cell reaction (always)
     *  2) player knock-back (only if alive)
     *  3) animate
     */
    punch(dir) {
        const { physicsEngine, eventEmitter } = this.gameContext;
        const vec = (dir && typeof dir.dx === 'number')
            ? dir
            : this.lastDirection;

        // 1) always trigger the cell logic (extinguish, bounce, etc.)
        const targetCell = physicsEngine.getCell({
            x: this.position.x + vec.dx,
            y: this.position.y + vec.dy
        });
        targetCell.punchedBy(this, vec);

        // 2) only living entities can knock others back
        if (this.isAlive) {
            const victim = physicsEngine.getEntityAt({
                x: this.position.x + vec.dx,
                y: this.position.y + vec.dy
            });
            if (victim) victim.punchedBy(vec);
        }

        // 3) animate your own punch
        this.lastDirection  = vec;
        this.isPunching     = true;
        this.punchDirection = vec;
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
     * Ghosts still get knocked back visually, but their isAlive=false
     * means they can pass through fire on any subsequent move().
     */
    punchedBy(vec) {
        const { physicsEngine, eventEmitter } = this.gameContext;

        // start the knockback animation
        this.isKnockedBack = true;
        eventEmitter.emit('entityUpdated', this.id);

        // compute the knockback destination (and if you died there)
        const { position: newPos, died } =
            physicsEngine.computeVictimKnockback(this.position, vec);

        // always move you (ghost or live) to that newPos
        this.position = newPos;
        eventEmitter.emit('entityUpdated', this.id);

        // if you died, flip isAlive after moving
        if (died) {
            this.die();
        }

        // clear the knockback flag in ~100ms
        setTimeout(() => {
            if (physicsEngine.players[this.id]) {
                this.isKnockedBack = false;
                eventEmitter.emit('entityUpdated', this.id);
            }
        }, 100);
    }

    die() {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.gameContext.eventEmitter.emit('playerDied', this.id);
    }
}

module.exports = PunchingEntity;
