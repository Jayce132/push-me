// GameServer.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PhysicsEngine = require('../game/PhysicsEngine');
const Player = require('../game/Player');
const FireManager = require('../game/FireManager');

class GameServer {
    constructor(port = 3000, config) {
        this.port = port;
        this.gridSize = config.gridSize;
        this.availableSkins = config.availableSkins;
        this.botSkin = config.botSkin;
        this.players = {};

        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
        });

        this.physicsEngine = new PhysicsEngine(this.gridSize, this.players);
        this.fireManager = new FireManager(this.gridSize, this.players, this.io);

        this.setupMiddleware();
        this.setupSocketEvents();
    }

    setupMiddleware() {
        this.app.use(cors());
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log(`Game: Player connected: ${socket.id}`);

            if (socket.id.startsWith("bot-")) {
                socket.disconnect(true);
                return;
            }

            if (this.fireManager.getFires().length === 0) {
                this.fireManager.reset();
            }

            const fires = this.fireManager.getFires();
            const spawnLocation = this.physicsEngine.findSafeSpawnLocation(fires);
            if (!spawnLocation) {
                socket.emit('noSafeSpawn');
                socket.disconnect(true);
                return;
            }

            const usedSkins = Object.values(this.players)
                .filter(p => !p.isBot)
                .map(p => p.skin);
            const skin = this.availableSkins.find(s => !usedSkins.includes(s)) || this.availableSkins[0];

            const gameContext = {
                players: this.players,
                io: this.io,
                gridSize: this.gridSize,
                physicsEngine: this.physicsEngine,
                botSkin: this.botSkin
            };

            this.players[socket.id] = new Player(socket.id, spawnLocation, skin, gameContext);

            this.fireManager.startFireInterval(() => {
                console.log("Game: One or zero humans left; switching all to lobby...");
                for (const pid in this.players) {
                    if (!this.players[pid].isBot) {
                        this.io.to(pid).emit('switchLobby', { lobbyUrl: 'http://localhost:3001' });
                        this.players[pid].isAlive = true;
                    }
                }
            });

            socket.emit('initializeGame', { gridSize: this.gridSize });
            socket.emit('updateState', { players: this.players, fires });

            socket.on('playerMove', (move) => {
                if (this.players[socket.id]) {
                    this.players[socket.id].move(move, this.fireManager.getFires());
                }
            });

            socket.on('playerPunch', (dir) => {
                if (this.players[socket.id]) {
                    this.players[socket.id].punch(dir, this.fireManager.getFires());
                }
            });

            socket.on('disconnect', () => {
                delete this.players[socket.id];

                const humanCount = Object.values(this.players).filter(p => !p.isBot).length;

                if (humanCount === 0) {
                    this.resetGrid();
                    this.fireManager.shutdown();
                } else {
                    this.io.emit('updateState', {
                        players: this.players,
                        fires: this.fireManager.getFires()
                    });
                }
            });
        });
    }

    resetGrid() {
        this.fireManager.shutdown();
        for (const pid in this.players) {
            delete this.players[pid];
        }
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Game server running on port ${this.port}`);
        });
    }
}

module.exports = GameServer;
