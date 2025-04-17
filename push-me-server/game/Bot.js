// game/Bot.js
const PunchingEntity = require('./PunchingEntity');

class Bot extends PunchingEntity {
    /**
     * @param {string} id
     * @param {{x:number,y:number}} position
     * @param {object} gameContext
     */
    constructor(id, position, gameContext) {
        super(id, position, gameContext.botSkin, gameContext);
        this.lastDirection = { dx: 0, dy: 1 };
        this.isBot = true;
    }

    /**
     * Compute unit vector toward a target player.
     */
    target(pid) {
        const { players } = this.gameContext;
        const t = players[pid];
        if (!t) return { dx: 0, dy: 0 };
        const dx = t.position.x - this.position.x;
        const dy = t.position.y - this.position.y;
        return {
            dx: dx === 0 ? 0 : dx / Math.abs(dx),
            dy: dy === 0 ? 0 : dy / Math.abs(dy)
        };
    }

    /**
     * AI loop: punch if adjacent else chase the first human.
     */
    update() {
        const { players } = this.gameContext;
        if (!players[this.id]) return;

        const humans = Object.keys(players).filter(pid => !players[pid].isBot);
        if (humans.length === 0) return;

        // Adjacent?
        for (const pid of humans) {
            const h = players[pid];
            const dx = Math.abs(h.position.x - this.position.x);
            const dy = Math.abs(h.position.y - this.position.y);
            if (Math.max(dx, dy) === 1) {
                this.punch({ dx: h.position.x - this.position.x, dy: h.position.y - this.position.y });
                return;
            }
        }

        // Otherwise chase
        const { dx, dy } = this.target(humans[0]);
        this.move({ dx, dy });
    }
}

module.exports = Bot;
