const { gridSize, botSkin } = require('./constants');
const { bouncePosition, isCellOccupied } = require('./physics');

class Bot {
    /**
     * Creates a new Bot instance.
     * @param {string} id - A unique identifier for the bot.
     * @param {object} position - The starting position { x, y }.
     * @param {object} gameContext - An object containing shared game state.
     *                              For example, { players, io }.
     */
    constructor(id, position, gameContext) {
        this.id = id;
        this.position = position;
        this.skin = botSkin;
        this.lastDirection = { dx: 0, dy: 1 }; // default direction
        this.gameContext = gameContext; // Contains players, io, gridSize, etc.
    }

    /**
     * Targets a specific player by calculating the normalized direction vector.
     * @param {string} targetPlayerId - The id of the target player.
     * @returns {object} The normalized direction { dx, dy } toward the target.
     */
    target(targetPlayerId) {
        const { players } = this.gameContext;
        const target = players[targetPlayerId];
        if (!target) return { dx: 0, dy: 0 };

        const diffX = target.position.x - this.position.x;
        const diffY = target.position.y - this.position.y;
        const dx = diffX === 0 ? 0 : diffX / Math.abs(diffX);
        const dy = diffY === 0 ? 0 : diffY / Math.abs(diffY);
        return { dx, dy };
    }

    /**
     * Moves the bot in the direction passed.
     * This method mimics the logic of shared move functions but is encapsulated within the bot.
     * @param {object} move - Direction object: { dx, dy }.
     */
    move(move) {
        const { players, io } = this.gameContext;

        // Calculate new position.
        let newPosition = {
            x: this.position.x + move.dx,
            y: this.position.y + move.dy
        };

        // Bounce the position if it goes outside of boundaries.
        newPosition = bouncePosition(newPosition, gridSize);

        // Block the move if another entity occupies the target cell.
        if (isCellOccupied(newPosition, this.id)) {
            console.log(`Bot move blocked for ${this.id}: cell occupied`);
            return;
        }

        // Simply update the position (ignore fire mechanics in the lobby).
        this.position = newPosition;
        this.lastDirection = move;

        // Only update global state if the bot still exists.
        if (players[this.id]) {
            players[this.id].position = this.position;
            players[this.id].lastDirection = this.lastDirection;
            io.emit('updateState', { players });
        }
    }

    /**
     * Simulates the bot punching in a given direction.
     * Checks for adjacent human players and, if a hit occurs, modifies their position.
     * @param {object} direction - Direction object: { dx, dy }.
     */
    punch(direction) {
        const { players, io } = this.gameContext;
        const dx = direction.dx;
        const dy = direction.dy;

        // Calculate the target coordinates for the punch.
        const targetX = this.position.x + dx;
        const targetY = this.position.y + dy;

        // If target is outside boundaries, bounce.
        if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
            let bounceX = this.position.x - dx * 3;
            let bounceY = this.position.y - dy * 3;
            bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
            bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
            this.position = { x: bounceX, y: bounceY };
            if (players[this.id]) {
                io.emit('updateState', { players });
            }
            return;
        }

        // Find a human player in the target cell.
        const punchedPlayerId = Object.keys(players).find(pid => {
            const p = players[pid];
            return !p.isBot && p.position.x === targetX && p.position.y === targetY;
        });

        if (punchedPlayerId) {
            // Adjust the player's position.
            const punchedPlayer = players[punchedPlayerId];
            const proposedX = punchedPlayer.position.x + dx * 3;
            const proposedY = punchedPlayer.position.y + dy * 3;

            if (proposedX >= 0 && proposedX < gridSize && proposedY >= 0 && proposedY < gridSize) {
                punchedPlayer.position.x = proposedX;
                punchedPlayer.position.y = proposedY;
            } else {
                let bounceX = punchedPlayer.position.x - dx * 3;
                let bounceY = punchedPlayer.position.y - dy * 3;
                bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
                bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
                punchedPlayer.position = { x: bounceX, y: bounceY };
            }

            // Update bot's punching state.
            if (players[this.id]) {
                players[this.id].isPunching = true;
                players[this.id].punchDirection = { dx, dy };
                io.emit('updateState', { players });
                setTimeout(() => {
                    if (players[this.id]) {
                        players[this.id].isPunching = false;
                        players[this.id].punchDirection = { dx: 0, dy: 0 };
                        io.emit('updateState', { players });
                    }
                }, 100);
            }
        }
    }

    /**
     * Encapsulates the complete bot update logic.
     * Checks for adjacent players to punch; if none are nearby, moves toward the first found human.
     */
    update() {
        const { players } = this.gameContext;
        // Do nothing if the bot was removed.
        if (!players[this.id]) return;

        // Get all human players.
        const humanIds = Object.keys(players).filter(pid => !players[pid].isBot);
        if (humanIds.length === 0) return;

        // Check if any human is adjacent.
        for (const humanId of humanIds) {
            const human = players[humanId];
            const diffX = Math.abs(human.position.x - this.position.x);
            const diffY = Math.abs(human.position.y - this.position.y);
            if (Math.max(diffX, diffY) === 1) {
                // Punch toward an adjacent human.
                const dx = human.position.x - this.position.x;
                const dy = human.position.y - this.position.y;
                this.punch({ dx, dy });
                return;
            }
        }

        // Otherwise, move toward the first human.
        const target = players[humanIds[0]];
        const diffX = target.position.x - this.position.x;
        const diffY = target.position.y - this.position.y;
        const stepX = diffX === 0 ? 0 : diffX / Math.abs(diffX);
        const stepY = diffY === 0 ? 0 : diffY / Math.abs(diffY);
        this.move({ dx: stepX, dy: stepY });
    }
}

module.exports = Bot;
