const EventEmitter = require('events');

class FireManager {
    /**
     * @param {number} gridSize
     * @param {Object<string,Player>} players
     * @param {SocketServer} io
     * @param {EventEmitter} eventEmitter
     */
    constructor(gridSize, players, io, eventEmitter) {
        this.gridSize     = gridSize;
        this.players      = players;
        this.io           = io;
        this.eventEmitter = eventEmitter;

        // initial fire(s)
        this.fires    = [ this.randomFire() ];
        this.interval = null;

        // ghosts extinguish fires
        this.eventEmitter.on('extinguishFire', ({ x, y }) => {
            this.fires = this.fires.filter(f => f.x !== x || f.y !== y);
            this.eventEmitter.emit('entityUpdated');
            if (this.fires.length === 0) {
                this.eventEmitter.emit('firesCleared');
            }
        });
    }

    randomFire() {
        return {
            x: Math.floor(Math.random() * this.gridSize),
            y: Math.floor(Math.random() * this.gridSize)
        };
    }

    getFires() {
        return this.fires;
    }

    getEffectiveHumanCount() {
        return Object.values(this.players).filter(p => !p.isBot).length;
    }

    startFireInterval() {
        if (this.interval) return;
        if (this.getEffectiveHumanCount() === 0) {
            console.log("FireManager: No humans at start — aborting fire.");
            return;
        }

        // if we've been shutdown or it's a re‑entry, repopulate a fresh fire
        if (this.fires.length === 0) {
            console.log("FireManager: resetting initial fire for new round");
            this.fires = [ this.randomFire() ];
            this.eventEmitter.emit('entityUpdated');
        }

        this.interval = setInterval(() => {
            if (this.getEffectiveHumanCount() === 0) {
                console.log("FireManager: Humans left — stopping fire.");
                return this.shutdown();
            }

            this.spread();
            this.eventEmitter.emit('entityUpdated');
        }, 3000);
    }

    spread() {
        console.log("FireManager: Fire is spreading...");
        const newFires = [ ...this.fires ];
        for (const fire of this.fires) {
            for (const [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
                const nx = fire.x + dx, ny = fire.y + dy;
                if (
                    Math.random() > 0.5 &&
                    !newFires.some(f => f.x === nx && f.y === ny) &&
                    nx >= 0 && ny >= 0 &&
                    nx < this.gridSize && ny < this.gridSize
                ) {
                    newFires.push({ x: nx, y: ny });

                    // kill any standing human
                    for (const pid in this.players) {
                        const p = this.players[pid];
                        if (!p.isBot && p.position.x === nx && p.position.y === ny && p.isAlive) {
                            p.isAlive = false;
                            this.eventEmitter.emit('playerDied', pid);
                        }
                    }
                }
            }
        }
        this.fires = newFires;
    }

    shutdown() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.fires = [];
        this.eventEmitter.emit('entityUpdated');
    }

    reset() {
        // repopulate a single fire
        this.fires = [ this.randomFire() ];
        this.eventEmitter.emit('entityUpdated');
    }
}

module.exports = FireManager;
