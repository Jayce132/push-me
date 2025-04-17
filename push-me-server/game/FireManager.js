class FireManager {
    constructor(gridSize, players, io) {
        this.gridSize = gridSize;
        this.players = players;
        this.io = io;
        this.fires = [this.randomFire()];
        this.interval = null;
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

    startFireInterval(callbackOnLastHuman) {
        if (this.interval) return;

        const humanCount = this.getEffectiveHumanCount();
        if (humanCount === 0) {
            console.log("FireManager: No humans at start — aborting fire.");
            return;
        }

        this.interval = setInterval(() => {
            const count = this.getEffectiveHumanCount();
            if (count === 0) {
                console.log("FireManager: Humans left — stopping fire.");
                this.shutdown();
                return;
            }

            this.spread();
            this.io.emit('updateState', { players: this.players, fires: this.fires });

            const alive = Object.values(this.players).filter(p => !p.isBot && p.isAlive);
            if (alive.length <= 1) {
                callbackOnLastHuman();
            }
        }, 3000);
    }

    spread() {
        if (this.getEffectiveHumanCount() === 0) {
            console.log("FireManager: Skipped spreading — no human players.");
            return;
        }

        console.log("FireManager: Fire is spreading...");
        const newFires = [...this.fires];

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

                    for (const pid in this.players) {
                        const player = this.players[pid];
                        if (player.position.x === newX && player.position.y === newY) {
                            if (!player.isBot) {
                                player.isAlive = false;
                            } else {
                                this.io.to(pid).emit('gameOver', { socketId: pid });
                                delete this.players[pid];
                            }
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
        this.io.emit('updateState', { players: this.players, fires: this.fires });
    }

    reset() {
        this.fires = [this.randomFire()];
        this.io.emit('updateState', { players: this.players, fires: this.fires });
    }
}

module.exports = FireManager;
