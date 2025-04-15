// game/botLogic.js
const { bouncePosition, isCellOccupied, findSafeSpawnLocation } = require('./physics');
const { gridSize, players } = require('./constants');

// In lobby mode, players and bots never die.
// When there is at least one human, spawn the bot (only one bot should exist).
// When no human players are connected, remove the bot and clear the players object.
function spawnBot() {
    const botId = "bot-" + Date.now();
    console.log(`Lobby: Spawning bot: ${botId}`);
    const spawnLocation = findSafeSpawnLocation(gridSize, fires);
    if (!spawnLocation) return;
    players[botId] = {
        position: spawnLocation,
        skin: botSkin,
        isBot: true,
        lastDirection: { dx: 0, dy: 1 }
    };
    io.emit('updateState', { players, fires });
    // In lobby mode, the bot continuously moves using lobby logic.
    setInterval(() => {
        botMoveLogic(botId, sharedMoveBot, botPunch, fires, io);
    }, 250);
}

/**
 * botMoveLogic:
 * Looks for nearby human players. If one is adjacent, calls botPunch; otherwise, it moves toward the first human.
 * In this version (for lobby) the bots always behave using lobby logic.
 * @param {string} botId - ID of the bot.
 * @param {function} moveBotFn - The generic moveBot function.
 * @param {function} botPunchFn - The generic botPunch function.
 * @param {Array} fires - Current fire cells.
 * @param {object} io - The socket.io instance.
 */
function botMoveLogic(botId, moveBotFn, botPunchFn, fires, io) {
    const bot = players[botId];
    if (!bot) return;
    const humanIds = Object.keys(players).filter(pid => !players[pid].isBot);
    if (humanIds.length === 0) return;
    // Check if any human is adjacent.
    for (const humanId of humanIds) {
        const human = players[humanId];
        const diffX = Math.abs(human.position.x - bot.position.x);
        const diffY = Math.abs(human.position.y - bot.position.y);
        if (Math.max(diffX, diffY) === 1) {
            const dx = human.position.x - bot.position.x;
            const dy = human.position.y - bot.position.y;
            // Call botPunch with lobby behavior.
            botPunchFn(botId, { dx, dy }, fires, io);
            return;
        }
    }
    // Otherwise, move toward the first human.
    const target = players[humanIds[0]];
    const diffX = target.position.x - bot.position.x;
    const diffY = target.position.y - bot.position.y;
    const stepX = diffX === 0 ? 0 : diffX / Math.abs(diffX);
    const stepY = diffY === 0 ? 0 : diffY / Math.abs(diffY);
    moveBotFn(botId, { dx: stepX, dy: stepY }, fires, io);
}

/**
 * botPunch:
 * Processes a bot punch action.
 * In lobby mode, when a human is hit and ends up on fire the affected human is respawned instead of being removed.
 * @param {string} botId - The ID of the bot doing the punching.
 * @param {object} direction - Object with properties {dx, dy}.
 * @param {Array} fires - Array of current fire cells.
 * @param {object} io - The socket.io instance.
 */
function botPunch(botId, direction, fires, io) {
    const punchingBot = players[botId];
    const { dx, dy } = direction;
    const targetX = punchingBot.position.x + dx;
    const targetY = punchingBot.position.y + dy;

    if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
        let bounceX = punchingBot.position.x - dx * 3;
        let bounceY = punchingBot.position.y - dy * 3;
        bounceX = Math.max(0, Math.min(gridSize - 1, bounceX));
        bounceY = Math.max(0, Math.min(gridSize - 1, bounceY));
        if (fires.some(f => f.x === bounceX && f.y === bounceY)) {
            delete players[botId];
        } else {
            punchingBot.position.x = bounceX;
            punchingBot.position.y = bounceY;
        }
        io.emit('updateState', { players, fires });
        return;
    }
    const punchedPlayerId = Object.keys(players).find(pid => {
        const p = players[pid];
        return !p.isBot && p.position.x === targetX && p.position.y === targetY;
    });
    if (punchedPlayerId) {
        const punchedPlayer = players[punchedPlayerId];
        const proposedX = punchedPlayer.position.x + dx * 3;
        const proposedY = punchedPlayer.position.y + dy * 3;
        if (proposedX >= 0 && proposedX < gridSize && proposedY >= 0 && proposedY < gridSize) {
            if (fires.some(f => f.x === proposedX && f.y === proposedY)) {
                // In lobby mode, respawn the punched player.
                const safe = findSafeSpawnLocation(gridSize, fires);
                if (safe) {
                    punchedPlayer.position = safe;
                    console.log(`Lobby: Player ${punchedPlayerId} hit fire due to bot punch and respawned`);
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
    punchingBot.isPunching = true;
    punchingBot.punchDirection = { dx, dy };
    io.emit('updateState', { players, fires });
    setTimeout(() => {
        if (players[botId]) {
            players[botId].isPunching = false;
            players[botId].punchDirection = { dx: 0, dy: 0 };
            io.emit('updateState', { players, fires });
        }
    }, 100);
}


module.exports = { botMoveLogic, botPunch };
