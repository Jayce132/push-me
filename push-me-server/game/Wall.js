class Wall {
    /**
     * @param {{x:number,y:number}} pos
     * @param {PhysicsEngine} physicsEngine
     */
    constructor(pos, physicsEngine) {
        this.x = pos.x;
        this.y = pos.y;
        this.physicsEngine = physicsEngine;
    }

    toJSON() {
        return { x: this.x, y: this.y, type: 'wall' };
    }

    /**
     * When you walk into a wall, bounce you back along the same axis.
     * @param {PunchingEntity} entity
     * @param {{dx:number,dy:number}} vec
     */
    movedInto(entity, vec) {
        // original pos
        const { x: ox, y: oy } = entity.position;
        // bounce back one cell opposite to vec
        const bounced = { x: ox - vec.dx, y: oy - vec.dy };
        // clamp inside
        entity.position = this.physicsEngine.bouncePosition(bounced);

        // commit and notify
        const { players, eventEmitter } = entity.gameContext;
        players[entity.id].position = entity.position;
        eventEmitter.emit('entityUpdated', entity.id);
    }

    /**
     * When you punch a wall, knock yourself back three cells.
     * @param {PunchingEntity} attacker
     * @param {{dx:number,dy:number}} vec
     */
    punchedBy(attacker, vec) {
        const { physicsEngine } = attacker.gameContext;
        // reuse computeSelfKnockback (which now grabs fires internally)
        const { position, died } = physicsEngine.computeSelfKnockback(
            attacker.position, vec
        );

        attacker.position = position;
        const { players, eventEmitter } = attacker.gameContext;
        players[attacker.id].position = position;
        if (died && attacker.isAlive) attacker.die();
        eventEmitter.emit('entityUpdated', attacker.id);
    }

    /**
     * If someone gets knocked into this wall cell, treat like punched it.
     */
    knockedInto(victim, vec) {
        this.punchedBy(victim, vec);
    }
}

module.exports = Wall;
