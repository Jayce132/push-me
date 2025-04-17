// game/Player.js
const PunchingEntity = require('./PunchingEntity');

class Player extends PunchingEntity {
    /**
     * @param {string} id
     * @param {{x:number,y:number}} position
     * @param {string} skin
     * @param {object} gameContext
     */
    constructor(id, position, skin, gameContext) {
        super(id, position, skin, gameContext);
        this.isBot = false;  // explicit, though default
    }
}

module.exports = Player;
