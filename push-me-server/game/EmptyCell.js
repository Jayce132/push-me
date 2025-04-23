// game/EmptyCell.js
class EmptyCell {
    constructor(pos, physicsEngine) {
        this.x = pos.x; this.y = pos.y;
        this.physicsEngine = physicsEngine;
    }
    toJSON() { return { x:this.x, y:this.y }; }
    movedInto(entity) {
        // just step through
        entity.position = { x:this.x, y:this.y };
        entity.gameContext.players[entity.id].position = entity.position;
        entity.gameContext.eventEmitter.emit('entityUpdated', entity.id);
    }
    punchedBy(attacker, vec) {
        // empty ground—no reaction to punches
    }
    knockedInto(victim, vec) {
        // same as move
        this.movedInto(victim);
    }
}
module.exports = EmptyCell;
