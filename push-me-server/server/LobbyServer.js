const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const EventEmitter = require('events');

const PhysicsEngine = require('../game/PhysicsEngine');
const {
    assignSkinAndScore,
    createPlayer,
    bindEntityUpdate,
    serializePlayers
} = require('./utils/sharedGame');

class LobbyServer {
    constructor(port = 3001, { gridSize, availableSkins }) {
        this.port = port;
        this.gridSize = gridSize;
        this.availableSkins = availableSkins;
        this.players = {};

        this.eventEmitter = new EventEmitter();
        this.physicsEngine = new PhysicsEngine(this.gridSize, this.players);

        this.app = express();
        this.app.use(cors());
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
        });

        bindEntityUpdate(this.eventEmitter, this.io, 'lobbyEntityUpdated', this.players);
        this._setupSockets();
    }

    _setupSockets() {
        this.io.on('connection', socket => {
            console.log(`Lobby: ${socket.id} connected`);

            const usedSkins = new Set(Object.values(this.players).map(p => p.skin));
            const assigned = assignSkinAndScore(socket.handshake.query, this.availableSkins, usedSkins);

            if (!assigned) {
                socket.emit('noSkinAvailable', { message: 'All skins in use.' });
                return socket.disconnect(true);
            }

            const spawn = this.physicsEngine.findSafeSpawnLocation([]);
            const context = {
                players: this.players,
                gridSize: this.gridSize,
                physicsEngine: this.physicsEngine,
                eventEmitter: this.eventEmitter
            };

            this.players[socket.id] = createPlayer(socket.id, spawn, assigned.skin, assigned.score, context);

            socket.emit('initializeLobby', { gridSize: this.gridSize });
            socket.emit('lobbyEntityUpdated', { players: serializePlayers(this.players) });

            socket.on('lobbyPlayerMove', move => {
                this.players[socket.id]?.move(move, []);
            });

            socket.on('lobbyPlayerPunch', dir => {
                this.players[socket.id]?.punch(dir, []);
            });

            socket.on('startArena', () => {
                for (const [id, p] of Object.entries(this.players)) {
                    this.io.to(id).emit('switchToArena', {
                        skin: p.skin,
                        score: p.score
                    });
                }
            });

            socket.on('disconnect', () => {
                console.log(`Lobby: ${socket.id} disconnected`);
                delete this.players[socket.id];
                this.io.emit('lobbyEntityUpdated', { players: serializePlayers(this.players) });
            });
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Lobby server listening on port ${this.port}`);
        });
    }
}

module.exports = LobbyServer;
