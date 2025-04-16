const { bouncePosition, isCellOccupied, findSafeSpawnLocation } = require('./physics');
const { gridSize, players } = require('./constants');

/**
 * Moves a human player based on the move command.
 * In game mode (fires nonempty), if the new cell contains fire, the player is marked dead.
 * In lobby mode (fires empty), the move simply updates the player's position.
 *
 * @param {object} socket - The socket representing the connection.
 * @param {object|string} move - The move command.
 * @param {object} io - The socket.io instance.
 * @param {Array} fires - The current array of fire cells (defaults to empty, which means lobby mode).
 */
function movePlayer(socket, move, io, fires = []) {
    let newPlayerPosition = { ...players[socket.id].position };

    // If move is an object, add dx/dy; otherwise, handle string commands.
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

    // Apply bounce to keep within the grid.
    newPlayerPosition = bouncePosition(newPlayerPosition, gridSize);

    // Block move if the target cell is occupied.
    if (isCellOccupied(newPlayerPosition, socket.id)) {
        console.log(`Move blocked for ${socket.id}: cell occupied`);
        return;
    }

    // If we're in game mode (fires exist), check for collision with fire.
    if (fires.length > 0) {
        if (fires.some(fire => fire.x === newPlayerPosition.x && fire.y === newPlayerPosition.y)) {
            if (!players[socket.id].isBot) {
                // In game mode, mark human players as dead if they hit fire.
                players[socket.id].isAlive = false;
                console.log(`Player ${socket.id} touched fire and is now dead (spectating)`);
                io.emit('updateState', { players, fires });
                return;
            } else {
                socket.emit('gameOver', { socketId: socket.id });
                delete players[socket.id];
                return;
            }
        }
    }

    // Update the player's state.
    players[socket.id].position = newPlayerPosition;
    // If move is an object, use that as the lastDirection.
    players[socket.id].lastDirection = (typeof move === 'object' && move !== null) ? move : players[socket.id].lastDirection;

    io.emit('updateState', { players, fires });
}

module.exports = { movePlayer };
