// game/movement.js
const { bouncePosition, isCellOccupied, findSafeSpawnLocation } = require('./physics');
const { gridSize, players } = require('./constants');

/**
 * Moves a player based on the move command.
 * (This function remains unchanged because it handles human players.)
 * @param {string} gameMode - Either "game" or "lobby". (For players this branch remains.)
 * @param {object} socket - The socket representing the connection.
 * @param {object|string} move - The move command.
 * @param {Array} fires - The current array of fire cells.
 * @param {object} io - The socket.io instance.
 */
function movePlayer(gameMode, socket, move, fires, io) {
    let newPlayerPosition = { ...players[socket.id].position };

    if (typeof move === 'object' && move !== null) {
        newPlayerPosition.x += move.dx;
        newPlayerPosition.y += move.dy;
    } else {
        switch (move) {
            case 'up':
                newPlayerPosition.x = Math.max(0, newPlayerPosition.x - 1);
                break;
            case 'down':
                newPlayerPosition.x = Math.min(gridSize - 1, newPlayerPosition.x + 1);
                break;
            case 'left':
                newPlayerPosition.y = Math.max(0, newPlayerPosition.y - 1);
                break;
            case 'right':
                newPlayerPosition.y = Math.min(gridSize - 1, newPlayerPosition.y + 1);
                break;
            default:
                break;
        }
    }

    newPlayerPosition = bouncePosition(newPlayerPosition, gridSize);

    if (isCellOccupied(newPlayerPosition, socket.id)) {
        console.log(`Move blocked for ${socket.id}: cell occupied`);
        return;
    }

    if (fires.some(fire => fire.x === newPlayerPosition.x && fire.y === newPlayerPosition.y)) {
        if (gameMode === 'game') {
            if (!players[socket.id].isBot) {
                // Mark the player as dead rather than sending them to the lobby immediately.
                players[socket.id].isAlive = false;
                console.log(`Player ${socket.id} touched fire and is now dead (spectating)`);
                io.emit('updateState', { players, fires });
                return;
            } else {
                socket.emit('gameOver', { socketId: socket.id });
                delete players[socket.id];
                return;
            }
        } else if (gameMode === 'lobby') {
            const safeLocation = findSafeSpawnLocation(gridSize, fires);
            if (safeLocation) {
                players[socket.id].position = safeLocation;
                console.log(`Player ${socket.id} hit fire and respawned (lobby mode)`);
            } else {
                console.log(`No safe spawn available for player ${socket.id}`);
            }
        }
    } else {
        players[socket.id].position = newPlayerPosition;
        players[socket.id].lastDirection = move;
        io.emit('updateState', { players, fires });
    }
}


/**
 * Moves a bot based on the move command.
 * Now the bot behavior is always the lobby behavior.
 * @param {string} botId - The ID of the bot.
 * @param {object} move - The move command (object with dx and dy).
 * @param {Array} fires - The current array of fire cells.
 * @param {object} io - The socket.io instance.
 */
function moveBot(botId, move, fires, io) {
    let newPlayerPosition = { ...players[botId].position };

    if (typeof move === 'object' && move !== null) {
        newPlayerPosition.x += move.dx;
        newPlayerPosition.y += move.dy;
    }

    newPlayerPosition = bouncePosition(newPlayerPosition, gridSize);

    if (isCellOccupied(newPlayerPosition, botId)) {
        console.log(`Bot move blocked for ${botId}: cell occupied`);
        return;
    }

    // In lobby mode, when a bot hits fire, respawn it (instead of deleting it)
    if (fires.some(f => f.x === newPlayerPosition.x && f.y === newPlayerPosition.y)) {
        const safeLocation = findSafeSpawnLocation(gridSize, fires);
        if (safeLocation) {
            players[botId].position = safeLocation;
            console.log(`Bot ${botId} hit fire and respawned (lobby mode)`);
        } else {
            console.log(`No safe spawn available for bot ${botId} (lobby mode)`);
        }
    } else {
        players[botId].position = newPlayerPosition;
        players[botId].lastDirection = move;
    }

    io.emit('updateState', { players, fires });
}

module.exports = { movePlayer, moveBot };
