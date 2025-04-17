// server/FireManager.js
const EventEmitter = require('events');

class FireManager {
    /**
     * @param {number}        gridSize
     * @param {Object<string,Player>} players
     * @param {SocketServer}  io
     * @param {EventEmitter}  eventEmitter
     * @param {string}        roomName   - which room to broadcast into
     */
    constructor(gridSize, players, io, eventEmitter, roomName) {
        this.gridSize     = gridSize;
        this.players      = players;
        this.io           = io;
        this.eventEmitter = eventEmitter;
        this.room         = roomName;

        this.fires    = [ this.randomFire() ];
        this.interval = null;

        // listen for ghosts extinguishing fires
        this.eventEmitter.on('extinguishFire', ({ x, y }) => {
            // remove that fire
            this.fires = this.fires.filter(f => f.x !== x || f.y !== y);
            this._broadcastState();

            // if all gone, notify room
            if (this.fires.length === 0) {
                this.eventEmitter.emit('firesCleared');
            }
        });
    }

    /** get a random fire location */
    randomFire() {
        return {
            x: Math.floor(Math.random() * this.gridSize),
            y: Math.floor(Math.random() * this.gridSize)
        };
    }

    /** read-only access to fires */
    getFires() {
        return this.fires;
    }

    /** how many humans are still alive */
    getEffectiveHumanCount() {
        return Object.values(this.players).filter(p => !p.isBot).length;
    }

    /** begin fire spread loop */
    startFireInterval() {
        if (this.interval) return;
        if (this.getEffectiveHumanCount() === 0) {
            console.log("FireManager: no humans → aborting spread.");
            return;
        }

        this.interval = setInterval(() => {
            if (this.getEffectiveHumanCount() === 0) {
                console.log("FireManager: humans gone → stopping spread.");
                return this.shutdown();
            }
            this.spread();
            this._broadcastState();
        }, 3000);
    }

    /** spread fires to neighbors, kill any player there */
    spread() {
        const newFires = [...this.fires];

        for (const fire of this.fires) {
            for (const [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
                const x2 = fire.x + dx, y2 = fire.y + dy;
                if (
                    Math.random() > 0.5 &&
                    x2>=0 && y2>=0 && x2<this.gridSize && y2<this.gridSize &&
                    !newFires.some(f => f.x===x2 && f.y===y2)
                ) {
                    newFires.push({ x: x2, y: y2 });

                    // kill any human standing there
                    for (const pid in this.players) {
                        const p = this.players[pid];
                        if (!p.isBot && p.isAlive && p.position.x===x2 && p.position.y===y2) {
                            p.isAlive = false;
                            this.eventEmitter.emit('playerDied', pid);
                            // ensure clients get the updated alive/dead
                            this.eventEmitter.emit('entityUpdated', pid);
                        }
                    }
                }
            }
        }

        this.fires = newFires;
    }

    /** clear interval & wipe fires */
    shutdown() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.fires = [];
        this._broadcastState();
    }

    /** start fresh with one fire */
    reset() {
        this.fires = [ this.randomFire() ];
        this._broadcastState();
    }

    /** send updated state into the correct room only */
    _broadcastState() {
        this.io.to(this.room).emit('updateState', {
            players: this.players,
            fires:   this.fires
        });
    }
}

module.exports = FireManager;
