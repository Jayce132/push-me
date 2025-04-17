// index.js
const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const EventEmitter = require('events');

const LobbyRoom = require('./server/LobbyRoom');
const GameRoom  = require('./server/GameRoom');

const gridSize       = 25;
const availableSkins = ['😭','😫','😳','😨'];
const botSkin        = '🤖';

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET","POST"] }
});

const eventEmitter = new EventEmitter();
const lobbyPlayers = {};
const gamePlayers  = {};

// create both rooms *without* passing one into the other
const lobbyRoom = new LobbyRoom(io, 'lobby', {
    gridSize, availableSkins, botSkin,
    players: lobbyPlayers,
    eventEmitter
});
const gameRoom  = new GameRoom (io, 'game',  {
    gridSize, availableSkins, botSkin,
    players: gamePlayers,
    eventEmitter
});

lobbyRoom.init();
gameRoom.init();

// 1️⃣ when lobby tells us “startGame”, copy players → game, delete from lobby, notify clients
eventEmitter.on('startGame', humanIds => {
    // a) copy into gamePlayers
    gameRoom.addPlayersFromLobby(lobbyPlayers, humanIds);
    // b) remove from lobbyPlayers
    humanIds.forEach(id => delete lobbyPlayers[id]);
    // c) tell each socket to switch into “game”
    humanIds.forEach(id =>
        io.to(id).emit('switchRoom', { next: 'game', playerId: id })
    );
});

// 2️⃣ when game ends a round, move them back into lobby
eventEmitter.on('endRound', () => {
    const humanIds = Object.keys(gamePlayers).filter(
        id => !gamePlayers[id].isBot
    );
    // a) copy back into lobby
    lobbyRoom.addPlayersFromGame(gamePlayers, humanIds);
    // b) remove from gamePlayers
    humanIds.forEach(id => delete gamePlayers[id]);
    // c) notify clients to switch back
    humanIds.forEach(id =>
        io.to(id).emit('switchRoom', { next: 'lobby' })
    );
});

server.listen(3000, () => console.log('Unified server on port 3000'));

