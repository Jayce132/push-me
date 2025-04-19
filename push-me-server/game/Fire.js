// game/Fire.js
class Fire {
    /**
     * @param {{x:number,y:number}} pos
     * @param {number} gridSize
     * @param {Object<string,PunchingEntity>} players
     * @param {EventEmitter} eventEmitter
     */
    constructor(pos, gridSize, players, eventEmitter) {
        this.x = pos.x;
        this.y = pos.y;
        this.gridSize = gridSize;
        this.players = players;
        this.eventEmitter = eventEmitter;
    }

    /**
     * Look at four neighbors; for each one we randomly
     * decide to light it, then immediately kill any
     * player standing there (via their die()).
     *
     * @param {Set<string>} occupied  — set of "x,y" strings to avoid duplicates
     * @returns {Fire[]}  newly created fires
     */
    spread(occupied) {
        const deltas = [ [0,1], [1,0], [0,-1], [-1,0] ];
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
                // occupy that cell
                occupied.add(key);
                const fire = new Fire({ x: nx, y: ny }, this.gridSize, this.players, this.eventEmitter);
                newFires.push(fire);

                // immediately kill any player standing here
                for (const pid in this.players) {
                    const p = this.players[pid];
                    if (!p.isBot && p.isAlive && p.position.x === nx && p.position.y === ny) {
                        p.die();                     // calls playerDied → ArenaServer re‑emits entityUpdated
                    }
                }
            }
        }

        console.log("Fire is spreading...")

        return newFires;
    }

    toJSON() {
        return { x: this.x, y: this.y };
    }
}

module.exports = Fire;
