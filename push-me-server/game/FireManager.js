// game/FireManager.js
const Fire = require('./Fire');

class FireManager {
    constructor(gridSize, players, io, eventEmitter) {
        this.gridSize = gridSize;
        this.players = players;
        this.io = io;
        this.eventEmitter = eventEmitter;

        // start with one Fire instance
        this.fires = [this._makeRandomFire()];
        this.interval = null;

        this.eventEmitter.on('extinguishFire', ({x, y}) => {
            this.fires = this.fires.filter(f => !(f.x === x && f.y === y));
            this.eventEmitter.emit('entityUpdated');
            if (this.fires.length === 0) {
                this.eventEmitter.emit('firesCleared');
            }
        });
    }

    _makeRandomFire() {
        const pos = {
            x: Math.floor(Math.random() * this.gridSize),
            y: Math.floor(Math.random() * this.gridSize)
        };
        return new Fire(pos, this.gridSize, this.players, this.eventEmitter);
    }

    getFires() {
        // return plain objects for serialization
        return this.fires.map(f => f.toJSON());
    }

    getEffectiveHumanCount() {
        return Object.values(this.players).filter(p => !p.isBot).length;
    }

    startFireInterval() {

        if (this.interval) return;

        // if nobody’s here, bail
        if (this.getEffectiveHumanCount() === 0) {
            console.log("FireManager: No humans at start — aborting fire.");
            return;
        }

        if (this.fires.length === 0) {
            console.log("FireManager: resetting initial fire for new round");
            this.reset();
        }

        this.interval = setInterval(() => {
            if (this.getEffectiveHumanCount() === 0) {
                return this.shutdown();
            }

            this._spreadAll();
            this.eventEmitter.emit('entityUpdated');
        }, 3000);
    }

    _spreadAll() {
        // track occupied keys so two Fires don't double‑spawn the same cell
        const occupied = new Set(this.fires.map(f => `${f.x},${f.y}`));
        const newFires = [];

        for (const fire of this.fires) {
            newFires.push(...fire.spread(occupied));
        }

        this.fires = this.fires.concat(newFires);
    }

    shutdown() {
        clearInterval(this.interval);
        this.interval = null;
        this.fires = [];
        this.eventEmitter.emit('entityUpdated');
    }

    reset() {
        this.fires = [this._makeRandomFire()];
        this.eventEmitter.emit('entityUpdated');
    }
}

module.exports = FireManager;
