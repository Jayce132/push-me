const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PhysicsEngine = require('../game/PhysicsEngine');
const Player = require('../game/Player');
const Bot = require('../game/Bot');

class LobbyServer {
    constructor(port = 3001, config) {
        this.port = port;

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

        this.setupMiddleware();
        this.setupSocketEvents();
    }

    setupMiddleware() {
        this.app.use(cors());
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log(`Lobby: Player connected: ${socket.id}`);

            const spawnLocation = this.physicsEngine.findSafeSpawnLocation(this.fires);
            if (!spawnLocation) {
                socket.emit('noSafeSpawn');
                socket.disconnect(true);
                return;
            }

            const usedSkins = Object.values(this.players).filter(p => !p.isBot).map(p => p.skin);
            const skin = this.availableSkins.find(s => !usedSkins.includes(s)) || this.availableSkins[0];

            const gameContext = {
                players: this.players,
                io: this.io,
                gridSize: this.gridSize,
                physicsEngine: this.physicsEngine,
                botSkin: this.botSkin
            };

            this.players[socket.id] = new Player(socket.id, spawnLocation, skin, gameContext);

            socket.emit('initializeGame', { gridSize: this.gridSize });
            socket.emit('updateState', { players: this.players, fires: this.fires });

            socket.on('playerMove', (move) => {
                if (this.players[socket.id]) {
                    this.players[socket.id].move(move, this.fires);
                }
            });

            socket.on('playerPunch', (dir) => {
                if (this.players[socket.id]) {
                    this.players[socket.id].punch(dir, this.fires);
                }
            });

            socket.on('startGame', () => {
                this.readyPlayers.add(socket.id);

                const humanSocketIds = Object.keys(this.players).filter(pid => !this.players[pid].isBot);
                this.io.emit('updateReadyCount', this.readyPlayers.size);

                if (this.readyPlayers.size === humanSocketIds.length) {
                    humanSocketIds.forEach(id => {
                        this.io.to(id).emit('switchGame', { gameUrl: 'http://localhost:3000' });
                    });
                    this.readyPlayers.clear();
                    this.io.emit('updateReadyCount', 0); // reset counter for next game
                }
            });

            socket.on('disconnect', () => {
                delete this.players[socket.id];
                this.io.emit('updateState', { players: this.players, fires: this.fires });

                const humanCount = Object.values(this.players).filter(p => !p.isBot).length;
                if (humanCount === 0) {
                    for (const pid in this.players) delete this.players[pid];
                    this.io.emit('updateState', { players: this.players, fires: this.fires });
                }
            });

            // Spawn a bot if needed
            const humanCount = Object.values(this.players).filter(p => !p.isBot).length;
            const botExists = Object.values(this.players).some(p => p.isBot);
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
            fires: this.fires,
            io: this.io,
            gridSize: this.gridSize,
            physicsEngine: this.physicsEngine,
            botSkin: this.botSkin
        };

        const bot = new Bot(botId, spawnLocation, gameContext);

        // Use actual instance, not plain object
        this.players[botId] = bot;

        this.io.emit('updateState', { players: this.players, fires: this.fires });

        setInterval(() => {
            bot.update();
        }, 250);
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Lobby server running on port ${this.port}`);
        });
    }
}

module.exports = LobbyServer;

