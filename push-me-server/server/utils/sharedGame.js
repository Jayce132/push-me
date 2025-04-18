const Player = require('../../game/Player');

function serializePlayers(players) {
    const out = {};
    for (const [id, p] of Object.entries(players)) {
        out[id] = {
            position:       p.position,
            skin:           p.skin,
            score:          p.score,
            isAlive:        p.isAlive,
            isPunching:     p.isPunching,
            punchDirection: p.punchDirection
        };
    }
    return out;
}

function assignSkinAndScore(query, availableSkins, usedSkins) {
    const parsedScore = parseInt(query.score, 10);
    const isValid = query.skin && availableSkins.includes(query.skin) && !usedSkins.has(query.skin) && !isNaN(parsedScore);

    if (isValid) return { skin: query.skin, score: parsedScore };

    const free = availableSkins.filter(s => !usedSkins.has(s));
    if (free.length === 0) return null;

    return { skin: free[0], score: 0 };
}

function assignArenaPlayerFromLobby(query, availableSkins) {
    const parsedScore = parseInt(query.score, 10);
    const isValid = query.skin && availableSkins.includes(query.skin) && !isNaN(parsedScore);
    if (!isValid) return null;

    return { skin: query.skin, score: parsedScore };
}


function createPlayer(socketId, spawn, skin, score, context) {
    const player = new Player(socketId, spawn, skin, context);
    player.score = score;
    return player;
}

function bindEntityUpdate(eventEmitter, io, eventName, players) {
    eventEmitter.on('entityUpdated', () => {
        io.emit(eventName, { players: serializePlayers(players) });
    });
}

module.exports = {
    serializePlayers,
    assignSkinAndScore,
    assignArenaPlayerFromLobby,
    createPlayer,
    bindEntityUpdate
};
