const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const EventEmitter = require('events');

const PhysicsEngine = require('../game/PhysicsEngine');
const Bot = require('../game/Bot');
const {
    assignSkinAndScore,
    createPlayer,
    bindEntityUpdate,
    serializePlayers
} = require('./utils/sharedGame');

class LobbyServer {
    constructor(port = 3001, {gridSize, availableSkins, botSkin}) {
        this.port = port;
        this.gridSize = gridSize;
        this.availableSkins = availableSkins;
        this.botSkin = botSkin;

        // all entities in the lobby: human players + bot (if any)
        this.players = {};
        this.botId = null;

        this.eventEmitter = new EventEmitter();
        this.physicsEngine = new PhysicsEngine(this.gridSize, this.players);

        this.app = express();
        this.app.use(cors());
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {origin: "http://localhost:5173", methods: ["GET", "POST"]}
        });

        // HTTP endpoint to list free skins
        this.app.get('/skins', (req, res) => {
            const used = new Set(Object.values(this.players).map(p => p.skin));
            const free = this.availableSkins.filter(s => !used.has(s));
            res.json({freeSkins: free});
        });

        // whenever any entity updates, broadcast
        bindEntityUpdate(this.eventEmitter, this.io, 'lobbyEntityUpdated', this.players);

        this.eventEmitter.on('playSound', payload => {
            // broadcast sfx sound all connected sockets:
            this.io.emit('playSound', payload);
        });

        this._setupSockets();
    }

    _setupSockets() {
        this.io.on('connection', socket => {
            console.log(`Lobby: ${socket.id} connected`);

            // assign a human skin/score
            const usedSkins = new Set(Object.values(this.players).map(p => p.skin));
            const assigned = assignSkinAndScore(socket.handshake.query, this.availableSkins, usedSkins);
            if (!assigned) {
                socket.emit('noSkinAvailable', {message: 'All skins in use.'});
                return socket.disconnect(true);
            }

            // spawn the new human player
            const spawn = this.physicsEngine.findSafeSpawnLocation([]);
            const context = {
                players: this.players,
                gridSize: this.gridSize,
                physicsEngine: this.physicsEngine,
                eventEmitter: this.eventEmitter
            };
            this.players[socket.id] = createPlayer(
                socket.id,
                spawn,
                assigned.skin,
                assigned.score,
                context
            );

            // maybe bring in the lobby bot now that there's at least one human
            this._maybeSpawnBot();

            // initial lobby state
            socket.emit('initializeLobby', {gridSize: this.gridSize});
            socket.emit('lobbyEntityUpdated', {players: serializePlayers(this.players)});

            // human controls
            socket.on('lobbyPlayerMove', move => {
                this.players[socket.id]?.move(move, []);
            });
            socket.on('lobbyPlayerPunch', dir => {
                this.players[socket.id]?.punch(dir, []);
            });

            // start game: tear down bot, then let humans into arena
            socket.on('startArena', () => {
                this._maybeRemoveBot({keepForArena: true});
                for (const [id, p] of Object.entries(this.players)) {
                    if (p.isBot) continue;
                    this.io.to(id).emit('switchToArena', {
                        skin: p.skin,
                        score: p.score
                    });
                }

                console.log(this.players)
            });

            // on human disconnect: remove player, maybe remove bot if no humans left
            socket.on('disconnect', () => {
                console.log(`Lobby: ${socket.id} disconnected`);
                delete this.players[socket.id];
                this._maybeRemoveBot();
                this.io.emit('lobbyEntityUpdated', {players: serializePlayers(this.players)});
            });
        });
    }

    /**
     * Spawn the bot if there's at least one human & no bot yet.
     */
    _maybeSpawnBot() {
        const humanCount = Object.values(this.players).filter(p => !p.isBot).length;
        if (humanCount > 0 && !this.botId) {
            // pick a spawn location
            const spawn = this.physicsEngine.findSafeSpawnLocation([]);
            // instantiate the Bot (subclass of PunchingEntity)
            const botId = `bot-${Date.now()}`;
            const bot = new Bot(botId, spawn, this.botSkin, {
                physicsEngine: this.physicsEngine,
                eventEmitter: this.eventEmitter,
                players: this.players
            });
            this.players[botId] = bot;
            this.botId = botId;
            // broadcast new entity
            this.io.emit('lobbyEntityUpdated', {players: serializePlayers(this.players)});
        }
    }

    /**
     * Remove the bot if no humans remain, or unconditionally when starting arena.
     * @param {object} opts
     * @param {boolean} opts.keepForArena  if true, still remove the bot anyway
     */
    _maybeRemoveBot({keepForArena = false} = {}) {
        if (!this.botId) return;
        const humanCount = Object.values(this.players).filter(p => !p.isBot).length;
        if (humanCount === 0 || keepForArena) {
            const bot = this.players[this.botId];
            if (bot) bot.destroy();   // stop its AI loop
            delete this.players[this.botId];
            this.botId = null;
            this.io.emit('lobbyEntityUpdated', {players: serializePlayers(this.players)});
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Lobby server listening on port ${this.port}`);
        });
    }
}

module.exports = LobbyServer;
