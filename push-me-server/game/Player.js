// game/Player.js
const PunchingEntity = require('./PunchingEntity');
const Fire           = require('./Fire');
const Wall           = require('./Wall');

class Player extends PunchingEntity {
    /**
     * @param {string} id
     * @param {{x:number,y:number}} position
     * @param {string} skin
     * @param {{ physicsEngine: PhysicsEngine, eventEmitter: EventEmitter }} gameContext
     */
    constructor(id, position, skin, gameContext) {
        super(id, position, skin, gameContext);
        this.isBot = false;  // explicit, though default
    }

    /**
     * Move override so ghosts can walk through fire tiles.
     * Alive players still collide normally via super.move().
     */
    move(dir) {
        const { physicsEngine, eventEmitter } = this.gameContext;
        const vec = (dir && typeof dir.dx === 'number') ? dir : this.lastDirection;
        const tx  = this.position.x + vec.dx;
        const ty  = this.position.y + vec.dy;

        // 1) block if another live player is there
        const other = physicsEngine.getEntityAt({ x: tx, y: ty });
        if (other && other.id !== this.id) return;

        // 2) if ghost, phase through Fire cells
        if (!this.isAlive) {
            const cell = physicsEngine.getCell({ x: tx, y: ty });
            if (cell instanceof Fire) {
                // ghosts ignore fire and just move
                this.position = { x: tx, y: ty };
                return eventEmitter.emit('entityUpdated', this.id);
            }
        }

        // 3) everybody else—delegate to default
        super.move(dir);
    }

    /**
     * Override punch so that when *dead* (ghost):
     *  - extinguish fires
     *  - do NOT bounce off walls
     *  - do NOT knock back other players
     */
    punch(dir) {
        const { physicsEngine, eventEmitter } = this.gameContext;
        const vec = (dir && typeof dir.dx === 'number')
            ? dir
            : this.lastDirection;

        const tx = this.position.x + vec.dx;
        const ty = this.position.y + vec.dy;
        const cell = physicsEngine.getCell({ x: tx, y: ty });

        if (!this.isAlive) {
            // --- Ghost-specific behavior ---
            // 1) only extinguish fire cells
            if (cell instanceof Fire) {
                cell.punchedBy(this, vec);
            }
            // 2) do NOT bounce off walls (skip Wall behavior)
            // 3) do NOT knock back players (skip victim logic)
        } else {
            // --- Alive player: use default punching logic ---
            super.punch(dir);
            return;
        }

        // --- In both cases, animate the punch icon on this entity ---
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
}

module.exports = Player;
