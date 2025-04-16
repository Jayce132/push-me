function handlePunch(
    socket,
    punchDir,
    { players, gridSize, io, findSafeSpawnLocation, fires = [] }
) {
    // Determine whether we're in game mode (fires exist) or lobby mode.
    const isGameMode = fires.length > 0;
    const punchingPlayer = players[socket.id];
    let dx = 0, dy = 0;

    // Determine the punch direction.
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

    // Compute the target cell for the punch.
    const targetX = punchingPlayer.position.x + dx;
    const targetY = punchingPlayer.position.y + dy;

    // Ghost-specific logic only applies in game mode.
    if (!punchingPlayer.isAlive && isGameMode) {
        const fireIndex = fires.findIndex(f => f.x === targetX && f.y === targetY);
        if (fireIndex !== -1) {
            fires.splice(fireIndex, 1);
            console.log(`Ghost ${socket.id} extinguished fire at (${targetX}, ${targetY})`);
        }
        if (fires.length === 0) {
            console.log("All fires extinguished. Sending all players to lobby and resetting isAlive status.");
            Object.keys(players).forEach(pid => {
                const player = players[pid];
                if (!player.isBot) {
                    io.to(pid).emit('switchLobby', { lobbyUrl: 'http://localhost:3001' });
                    player.isAlive = true;
                }
            });
        }
        io.emit('updateState', { players, fires });
        return;
    }

    // Now, the normal punch logic.
    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
        // Out-of-bound: bounce the punching player.
        let bounceX = punchingPlayer.position.x - dx * 3;
        let bounceY = punchingPlayer.position.y - dy * 3;
        bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
        bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
        if (isGameMode && fires.some(f => f.x === bounceX && f.y === bounceY)) {
            punchingPlayer.isAlive = false;
            console.log(`Player ${socket.id} died from out-of-bound punch bounce (isAlive set to false)`);
        } else {
            punchingPlayer.position = { x: bounceX, y: bounceY };
        }
    } else {
        // Look for a punched player exactly in the target cell.
        const punchedPlayerId = Object.keys(players).find(pid => {
            const p = players[pid];
            return p.position.x === targetX && p.position.y === targetY;
        });
        if (punchedPlayerId) {
            const punchedPlayer = players[punchedPlayerId];
            const proposedX = punchedPlayer.position.x + dx * 3;
            const proposedY = punchedPlayer.position.y + dy * 3;
            if (proposedX >= 0 && proposedX < gridSize && proposedY >= 0 && proposedY < gridSize) {
                if (isGameMode && fires.some(f => f.x === proposedX && f.y === proposedY)) {
                    punchedPlayer.isAlive = false;
                    console.log(`Player ${punchedPlayerId} died from punch collision (isAlive set to false)`);
                } else {
                    punchedPlayer.position = { x: proposedX, y: proposedY };
                }
            } else {
                let bounceX = punchedPlayer.position.x - dx * 3;
                let bounceY = punchedPlayer.position.y - dy * 3;
                bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
                bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
                if (isGameMode && fires.some(f => f.x === bounceX && f.y === bounceY)) {
                    punchedPlayer.isAlive = false;
                    console.log(`Player ${punchedPlayerId} died from punch bounce (isAlive set to false)`);
                } else {
                    punchedPlayer.position = { x: bounceX, y: bounceY };
                }
            }
        }
    }

    // In both modes, update clients with the new state.
    io.emit('updateState', { players, fires });
}

module.exports = { handlePunch };
