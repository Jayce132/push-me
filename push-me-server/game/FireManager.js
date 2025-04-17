// game/FireManager.js
const EventEmitter = require('events');

class FireManager {
    /**
     * @param {number} gridSize
     * @param {Object<string,Player>} players
     * @param {SocketServer} io
     * @param {EventEmitter} eventEmitter
     */
    constructor(gridSize, players, io, eventEmitter) {
        this.gridSize = gridSize;
        this.players = players;
        this.io = io;
        this.eventEmitter = eventEmitter;

        // initial fire(s)
        this.fires = [ this.randomFire() ];
        this.interval = null;

        // listen for ghosts extinguishing fires
        this.eventEmitter.on('extinguishFire', ({ x, y }) => {
            // remove that fire if still present
            this.fires = this.fires.filter(f => f.x !== x || f.y !== y);
            this.io.emit('updateState', { players: this.players, fires: this.fires });

            // if no fires remain, tell the GameServer
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

        this.interval = setInterval(() => {
            if (this.getEffectiveHumanCount() === 0) {
                console.log("FireManager: Humans left — stopping fire.");
                return this.shutdown();
            }

            this.spread();
            this.io.emit('updateState', {
                players: this.players,
                fires: this.fires
            });
        }, 3000);
    }

    spread() {
        console.log("FireManager: Fire is spreading...");
        const newFires = [ ...this.fires ];

        for (const fire of this.fires) {
            for (const [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
                const newX = fire.x + dx;
                const newY = fire.y + dy;

                if (
                    Math.random() > 0.5 &&
                    !newFires.some(f => f.x === newX && f.y === newY) &&
                    newX >= 0 && newY >= 0 &&
                    newX < this.gridSize && newY < this.gridSize
                ) {
                    newFires.push({ x: newX, y: newY });

                    // kill any player standing there
                    for (const pid in this.players) {
                        const p = this.players[pid];
                        if (!p.isBot &&
                            p.position.x === newX &&
                            p.position.y === newY &&
                            p.isAlive) {

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
        this.io.emit('updateState', {
            players: this.players,
            fires: this.fires
        });
    }

    reset() {
        this.fires = [ this.randomFire() ];
        this.io.emit('updateState', {
            players: this.players,
            fires: this.fires
        });
    }
}

module.exports = FireManager;
