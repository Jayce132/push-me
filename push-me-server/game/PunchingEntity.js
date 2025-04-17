// game/PunchingEntity.js
class PunchingEntity {
    /**
     * @param {string} id
     * @param {{x:number,y:number}} position
     * @param {string} skin
     * @param {object} gameContext  // { players, io, gridSize, physicsEngine }
     */
    constructor(id, position, skin, gameContext) {
        this.id = id;
        this.position = position;
        this.skin = skin;
        this.lastDirection = { dx: 0, dy: -1 };
        this.isAlive = true;
        this.isBot = false;
        this.gameContext = gameContext;
    }

    /** Strip non‑serializable fields for socket.io */
    toJSON() {
        return {
            id: this.id,
            position: this.position,
            skin: this.skin,
            lastDirection: this.lastDirection,
            isAlive: this.isAlive,
            isBot: this.isBot,
            isPunching: this.isPunching || false,
            punchDirection: this.punchDirection || { dx: 0, dy: 0 }
        };
    }

    /** Shared move logic */
    move(move, fires = []) {
        const { players, io, physicsEngine } = this.gameContext;
        let newPos = { ...this.position };

        // 1) Direction
        if (move && typeof move.dx === 'number') {
            newPos.x += move.dx;
            newPos.y += move.dy;
        } else {
            switch (move) {
                case 'up':    newPos.x = Math.max(0, newPos.x - 1); break;
                case 'down':  newPos.x = Math.min(physicsEngine.gridSize - 1, newPos.x + 1); break;
                case 'left':  newPos.y = Math.max(0, newPos.y - 1); break;
                case 'right': newPos.y = Math.min(physicsEngine.gridSize - 1, newPos.y + 1); break;
            }
        }

        // 2) Bounce
        newPos = physicsEngine.bouncePosition(newPos);

        // 3) Occupancy
        if (physicsEngine.isCellOccupied(newPos, this.id)) {
            console.log(`Move blocked for ${this.id}`);
            return;
        }

        // 4) Fire collision (game mode)
        if (fires.length > 0 && fires.some(f => f.x === newPos.x && f.y === newPos.y)) {
            if (!this.isBot) {
                this.isAlive = false;
            } else {
                io.to(this.id).emit('gameOver', { socketId: this.id });
                delete players[this.id];
            }
            io.emit('updateState', { players, fires });
            return;
        }

        // 5) Commit
        this.position = newPos;
        if (move && typeof move.dx === 'number') this.lastDirection = move;
        players[this.id].position = this.position;
        players[this.id].lastDirection = this.lastDirection;
        io.emit('updateState', { players, fires });
    }

    /** Shared punch logic */
    punch(dir, fires = []) {
        const { players, io, physicsEngine } = this.gameContext;
        const gameMode = fires.length > 0;
        let dx = 0, dy = 0;

        if (dir && typeof dir.dx === 'number') {
            dx = dir.dx; dy = dir.dy;
        } else {
            ({ dx, dy } = this.lastDirection);
        }

        const tx = this.position.x + dx, ty = this.position.y + dy;

        // Ghost extinguishes
        if (!this.isAlive && gameMode) {
            const idx = fires.findIndex(f => f.x === tx && f.y === ty);
            if (idx !== -1) fires.splice(idx, 1);
            if (fires.length === 0) {
                Object.values(players).forEach(p => {
                    if (!p.isBot) {
                        io.to(p.id).emit('switchLobby', { lobbyUrl: 'http://localhost:3001' });
                        p.isAlive = true;
                    }
                });
            }
            io.emit('updateState', { players, fires });
            return;
        }

        // Out‑of‑bounds bounce
        if (tx < 0 || tx >= physicsEngine.gridSize || ty < 0 || ty >= physicsEngine.gridSize) {
            let bx = this.position.x - dx * 3, by = this.position.y - dy * 3;
            bx = Math.max(0, Math.min(physicsEngine.gridSize - 1, bx));
            by = Math.max(0, Math.min(physicsEngine.gridSize - 1, by));

            if (gameMode && fires.some(f => f.x === bx && f.y === by)) {
                this.isAlive = false;
            } else {
                this.position = { x: bx, y: by };
            }
            players[this.id].position = this.position;
            io.emit('updateState', { players, fires });
            return;
        }

        // Knockback victim
        const victimId = Object.keys(players).find(pid =>
            players[pid].position.x === tx && players[pid].position.y === ty
        );
        if (!victimId) return;

        const victim = players[victimId];
        const px = victim.position.x + dx * 3, py = victim.position.y + dy * 3;
        if (px >= 0 && px < physicsEngine.gridSize && py >= 0 && py < physicsEngine.gridSize) {
            if (gameMode && fires.some(f => f.x === px && f.y === py)) {
                victim.isAlive = false;
            } else {
                victim.position = { x: px, y: py };
            }
        } else {
            let bx = victim.position.x - dx * 3, by = victim.position.y - dy * 3;
            bx = Math.max(0, Math.min(physicsEngine.gridSize - 1, bx));
            by = Math.max(0, Math.min(physicsEngine.gridSize - 1, by));
            if (gameMode && fires.some(f => f.x === bx && f.y === by)) {
                victim.isAlive = false;
            } else {
                victim.position = { x: bx, y: by };
            }
        }

        // Punch animation state
        players[this.id].isPunching = true;
        players[this.id].punchDirection = { dx, dy };
        io.emit('updateState', { players, fires });
        setTimeout(() => {
            if (players[this.id]) {
                players[this.id].isPunching = false;
                players[this.id].punchDirection = { dx: 0, dy: 0 };
                io.emit('updateState', { players, fires });
            }
        }, 100);
    }
}

module.exports = PunchingEntity;
