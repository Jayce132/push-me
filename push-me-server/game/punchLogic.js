// punchLogic.js

/**
 * Handles player punch logic in game mode.
 * In game mode, if a punched player hits fire, mark them as dead (isAlive false)
 * instead of sending them immediately to the lobby.
 *
 * @param {object} socket - The socket of the punching player.
 * @param {object} punchDir - The punch direction (object with properties dx and dy) or a string.
 * @param {object} params - Contains properties: players, fires, gridSize, io.
 */
function handlePunchGame(socket, punchDir, { players, fires, gridSize, io }) {
    const punchingPlayer = players[socket.id];
    let dx = 0, dy = 0;

    if (punchDir && typeof punchDir === 'object') {
        dx = punchDir.dx;
        dy = punchDir.dy;
    } else {
        switch (punchingPlayer.lastDirection) {
            case 'up':    dx = -1; break;
            case 'down':  dx = 1;  break;
            case 'left':  dy = -1; break;
            case 'right': dy = 1;  break;
            default: break;
        }
    }

    const targetX = punchingPlayer.position.x + dx;
    const targetY = punchingPlayer.position.y + dy;

    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
        let bounceX = punchingPlayer.position.x - dx * 3;
        let bounceY = punchingPlayer.position.y - dy * 3;
        bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
        bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
        if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
            // Instead of sending the player to lobby and deleting, mark as dead.
            players[socket.id].isAlive = false;
            console.log(`Player ${socket.id} died from out-of-bound punch bounce (isAlive set to false)`);
        } else {
            punchingPlayer.position.x = bounceX;
            punchingPlayer.position.y = bounceY;
        }
    } else {
        const punchedPlayerId = Object.keys(players).find(pid => {
            const p = players[pid];
            return p.position.x === targetX && p.position.y === targetY;
        });
        if (punchedPlayerId) {
            const punchedPlayer = players[punchedPlayerId];
            const proposedX = punchedPlayer.position.x + dx * 3;
            const proposedY = punchedPlayer.position.y + dy * 3;
            if (proposedX >= 0 && proposedX < gridSize && proposedY >= 0 && proposedY < gridSize) {
                if (fires.some(f => f.x === proposedX && f.y === proposedY)) {
                    // Instead of switching lobby and deleting, mark as dead.
                    punchedPlayer.isAlive = false;
                    console.log(`Player ${punchedPlayerId} died from punch collision (isAlive set to false)`);
                } else {
                    punchedPlayer.position.x = proposedX;
                    punchedPlayer.position.y = proposedY;
                }
            } else {
                let bounceX = punchedPlayer.position.x - dx * 3;
                let bounceY = punchedPlayer.position.y - dy * 3;
                bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
                bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
                if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
                    punchedPlayer.isAlive = false;
                    console.log(`Player ${punchedPlayerId} died from punch bounce (isAlive set to false)`);
                } else {
                    punchedPlayer.position.x = bounceX;
                    punchedPlayer.position.y = bounceY;
                }
            }
        }
    }
    io.emit('updateState', { players, fires });
    // (A check for the number of alive humans can be done in the update cycle in app.js.)
}

/**
 * Handles player punch logic in lobby mode.
 * (Lobby logic remains unchanged.)
 */
function handlePunchLobby(socket, punchDir, { players, fires, gridSize, findSafeSpawnLocation, io }) {
    const punchingPlayer = players[socket.id];
    let dx = 0, dy = 0;

    if (punchDir && typeof punchDir === 'object') {
        dx = punchDir.dx;
        dy = punchDir.dy;
    } else {
        switch (punchingPlayer.lastDirection) {
            case 'up':    dx = -1; break;
            case 'down':  dx = 1;  break;
            case 'left':  dy = -1; break;
            case 'right': dy = 1;  break;
            default: break;
        }
    }

    const targetX = punchingPlayer.position.x + dx;
    const targetY = punchingPlayer.position.y + dy;

    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
        let bounceX = punchingPlayer.position.x - dx * 3;
        let bounceY = punchingPlayer.position.y - dy * 3;
        bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
        bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
        if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
            const safe = findSafeSpawnLocation(gridSize, fires);
            if (safe) {
                players[socket.id].position = safe;
                console.log(`Lobby: Player ${socket.id} hit fire during punch bounce and respawned`);
            }
        } else {
            punchingPlayer.position.x = bounceX;
            punchingPlayer.position.y = bounceY;
        }
    } else {
        const punchedPlayerId = Object.keys(players).find(pid => {
            const p = players[pid];
            return p.position.x === targetX && p.position.y === targetY;
        });
        if (punchedPlayerId) {
            const punchedPlayer = players[punchedPlayerId];
            const proposedX = punchedPlayer.position.x + dx * 3;
            const proposedY = punchedPlayer.position.y + dy * 3;
            if (proposedX >= 0 && proposedX < gridSize && proposedY >= 0 && proposedY < gridSize) {
                if (fires.some(f => f.x === proposedX && f.y === proposedY)) {
                    const safe = findSafeSpawnLocation(gridSize, fires);
                    if (safe) {
                        punchedPlayer.position = safe;
                        console.log(`Lobby: Player ${punchedPlayerId} hit fire due to punch and respawned`);
                    }
                } else {
                    punchedPlayer.position.x = proposedX;
                    punchedPlayer.position.y = proposedY;
                }
            } else {
                let bounceX = punchedPlayer.position.x - dx * 3;
                let bounceY = punchedPlayer.position.y - dy * 3;
                bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
                bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
                if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
                    const safe = findSafeSpawnLocation(gridSize, fires);
                    if (safe) {
                        punchedPlayer.position = safe;
                        console.log(`Lobby: Player ${punchedPlayerId} hit fire on punch bounce and respawned`);
                    }
                } else {
                    punchedPlayer.position.x = bounceX;
                    punchedPlayer.position.y = bounceY;
                }
            }
        }
    }
    io.emit('updateState', { players, fires });
}

module.exports = {
    handlePunchGame,
    handlePunchLobby
};
