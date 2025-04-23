// game/Fire.js
class Fire {
    /**
     * @param {{x:number,y:number}} pos
     * @param {number} gridSize
     * @param {Object<string,PunchingEntity>} players
     * @param {EventEmitter} eventEmitter
     */
    constructor(pos, gridSize, players, eventEmitter) {
        this.x            = pos.x;
        this.y            = pos.y;
        this.gridSize     = gridSize;
        this.players      = players;
        this.eventEmitter = eventEmitter;
    }

    toJSON() {
        return { x: this.x, y: this.y };
    }

    /**
     * Called when any entity steps/moves into this fire cell.
     * Non-bots die immediately.
     */
    movedInto(entity) {
        if (!entity.isBot && entity.isAlive) {
            entity.die();
        }
    }

    /**
     * Called when someone punches into this fire cell.
     * Only *dead* entities (ghosts) may extinguish.
     */
    punchedBy(attacker, vec) {
        // `attacker.isAlive === false` means “ghost”
        if (!attacker.isAlive) {
            this.eventEmitter.emit('extinguishFire', { x: this.x, y: this.y });
        }
    }

    /**
     * Called when a victim is knocked into this cell.
     * Same effect as walking into fire.
     */
    knockedInto(entity, vec) {
        this.movedInto(entity);
    }

    /**
     *  Fire‐spreading logic
     */
    spread(occupied) {
        const deltas = [ [0,1],[1,0],[0,-1],[-1,0] ];
        const newFires = [];

        for (const [dx,dy] of deltas) {
            const nx = this.x + dx, ny = this.y + dy;
            const key = `${nx},${ny}`;

            if (
                Math.random() < 0.5 &&
                nx >= 0 && ny >= 0 &&
                nx < this.gridSize && ny < this.gridSize &&
                !occupied.has(key)
            ) {
                occupied.add(key);
                const fire = new Fire({ x: nx, y: ny }, this.gridSize, this.players, this.eventEmitter);
                newFires.push(fire);

                // kill any standing human
                for (const pid in this.players) {
                    const p = this.players[pid];
                    if (!p.isBot && p.isAlive && p.position.x === nx && p.position.y === ny) {
                        p.die(); // emits playerDied → ArenaServer will re-emit entityUpdated
                    }
                }
            }
        }

        return newFires;
    }
}

module.exports = Fire;
