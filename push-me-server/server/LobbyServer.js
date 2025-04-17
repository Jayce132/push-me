// game/LobbyServer.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const EventEmitter = require('events');

const PhysicsEngine = require('../game/PhysicsEngine');
const Player = require('../game/Player');
const Bot = require('../game/Bot');

class LobbyServer {
    constructor(port = 3001, config) {
        this.port = port;

        // shared event bus for all punching/movement events
        this.eventEmitter = new EventEmitter();

        // Extract constants from config
        this.gridSize = config.gridSize;
        this.availableSkins = config.availableSkins;
        this.botSkin = config.botSkin;
        this.players = {};

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: "http://localhost:5173",
                methods: ["GET", "POST"]
            }
        });

        this.fires = [];
        this.physicsEngine = new PhysicsEngine(this.gridSize, this.players);
        this.readyPlayers = new Set();

        this._bindEvents();
        this.setupMiddleware();
        this.setupSocketEvents();
    }

    _bindEvents() {
        // whenever any entity moves, punches, dies or extinguishes fire,
        // broadcast the updated state to everyone in the lobby
        this.eventEmitter.on('entityUpdated', () => {
            this.io.emit('updateState', {
                players: this.players,
                fires: this.fires
            });
        });
    }

    setupMiddleware() {
        this.app.use(cors());
    }

    setupSocketEvents() {
        this.io.on('connection', socket => {
            console.log(`Lobby: Player connected: ${socket.id}`);

            const spawnLocation = this.physicsEngine.findSafeSpawnLocation(this.fires);
            if (!spawnLocation) {
                socket.emit('noSafeSpawn');
                socket.disconnect(true);
                return;
            }

            const usedSkins = Object.values(this.players)
                .filter(p => !p.isBot)
                .map(p => p.skin);
            const skin = this.availableSkins.find(s => !usedSkins.includes(s))
                || this.availableSkins[0];

            // build context with eventEmitter instead of io
            const gameContext = {
                players: this.players,
                gridSize: this.gridSize,
                physicsEngine: this.physicsEngine,
                botSkin: this.botSkin,
                eventEmitter: this.eventEmitter
            };

            // create a new Player (which under the hood uses PunchingEntity)
            this.players[socket.id] = new Player(
                socket.id,
                spawnLocation,
                skin,
                gameContext
            );

            // initial state push
            socket.emit('initializeGame', { gridSize: this.gridSize });
            socket.emit('updateState', { players: this.players, fires: this.fires });

            // delegate moves & punches to Player; updates will come via entityUpdated
            socket.on('playerMove', move => {
                this.players[socket.id]?.move(move, this.fires);
            });

            socket.on('playerPunch', dir => {
                this.players[socket.id]?.punch(dir, this.fires);
            });

            socket.on('startGame', () => {
                this.readyPlayers.add(socket.id);
                this.io.emit('updateReadyCount', this.readyPlayers.size);

                const humanSocketIds = Object.keys(this.players)
                    .filter(pid => !this.players[pid].isBot);

                if (this.readyPlayers.size === humanSocketIds.length) {
                    humanSocketIds.forEach(id => {
                        this.io.to(id).emit('switchGame', { gameUrl: 'http://localhost:3000' });
                    });
                    this.readyPlayers.clear();
                    this.io.emit('updateReadyCount', 0);
                }
            });

            socket.on('disconnect', () => {
                delete this.players[socket.id];
                this.io.emit('updateState', { players: this.players, fires: this.fires });

                // clean up bots/humans if nobody left
                const humanCount = Object.values(this.players)
                    .filter(p => !p.isBot).length;
                if (humanCount === 0) {
                    Object.keys(this.players).forEach(pid => delete this.players[pid]);
                    this.io.emit('updateState', { players: this.players, fires: this.fires });
                }
            });

            // ensure at least one bot in lobby
            const humanCount = Object.values(this.players)
                .filter(p => !p.isBot).length;
            const botExists = Object.values(this.players)
                .some(p => p.isBot);
            if (humanCount > 0 && !botExists) {
                this.spawnBot();
            }
        });
    }

    spawnBot() {
        const botId = "bot-" + Date.now();
        const spawnLocation = this.physicsEngine.findSafeSpawnLocation(this.fires);
        if (!spawnLocation) return;

        const gameContext = {
            players: this.players,
            gridSize: this.gridSize,
            physicsEngine: this.physicsEngine,
            botSkin: this.botSkin,
            eventEmitter: this.eventEmitter
        };

        const bot = new Bot(botId, spawnLocation, gameContext);
        this.players[botId] = bot;

        // initial update for everyone
        this.io.emit('updateState', { players: this.players, fires: this.fires });

        // drive the bot’s AI
        setInterval(() => bot.update(), 250);
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Lobby server running on port ${this.port}`);
        });
    }
}

module.exports = LobbyServer;
