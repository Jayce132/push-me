const PunchingEntity = require('./PunchingEntity');

class Bot extends PunchingEntity {
    constructor(id, position, skin, gameContext) {
        super(id, position, skin, gameContext);
        this.isBot = true;
        this._respawnDelay = 3000; // 3 seconds respawn delay
        this._aiInterval = setInterval(() => this._runAI(), 500);
    }

    _runAI() {
        if (!this.isAlive) return;

        const { physicsEngine, players } = this.gameContext;

        const aliveHumans = Object.values(players)
            .filter(p => !p.isBot && p.isAlive);
        if (aliveHumans.length === 0) {
            return;
        }

        const x = this.position.x;
        const y = this.position.y;

        // Pick the **closest** human
        let target = aliveHumans[0];
        let minDistance = Math.abs(target.position.x - x) + Math.abs(target.position.y - y);

        for (const p of aliveHumans) {
            const dist = Math.abs(p.position.x - x) + Math.abs(p.position.y - y);
            if (dist < minDistance) {
                minDistance = dist;
                target = p;
            }
        }

        const tx = target.position.x;
        const ty = target.position.y;
        const dx = tx - x;
        const dy = ty - y;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);

        const isAdjacent = (adx === 1 && ady === 0) || (adx === 0 && ady === 1) || (adx === 1 && ady === 1);

        if (isAdjacent) {
            const dir = {
                dx: dx === 0 ? 0 : dx / adx,
                dy: dy === 0 ? 0 : dy / ady
            };
            this.punch(dir);
        } else {
            const moveDir = {
                dx: dx === 0 ? 0 : dx / adx,
                dy: dy === 0 ? 0 : dy / ady
            };
            this.move(moveDir);
        }
    }

    die() {
        super.die();

        setTimeout(() => {
            this._respawn();
        }, this._respawnDelay);
    }

    _respawn() {
        if (this.isAlive) return;

        const { physicsEngine, eventEmitter } = this.gameContext;

        const spawn = physicsEngine.findSafeSpawnLocation([]);
        this.position.x = spawn.x;
        this.position.y = spawn.y;

        this.isAlive = true;

        eventEmitter.emit('entityUpdated', {
            id: this.id,
            position: this.position,
            isAlive: this.isAlive
        });
    }

    destroy() {
        clearInterval(this._aiInterval);
    }
}

module.exports = Bot;
