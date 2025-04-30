const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const cors = require('cors');
const EventEmitter = require('events');

const PhysicsEngine = require('../game/PhysicsEngine');
const FireManager = require('../game/FireManager');
const {
    assignArenaPlayerFromLobby,
    createPlayer,
    serializePlayers
} = require('./utils/sharedGame');

class ArenaServer {
    constructor(port = 3000, {gridSize, availableSkins}) {
        this.port = port;
        this.gridSize = gridSize;
        this.availableSkins = availableSkins;
        this.players = {};

        this.eventEmitter = new EventEmitter();

        // express + socket.io
        this.app = express();
        this.app.use(cors());
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: {origin: "http://localhost:5173", methods: ["GET", "POST"]}
        });

        // fire manager
        this.fireManager = new FireManager(
            this.gridSize,
            this.players,
            this.io,
            this.eventEmitter
        );

        this.physicsEngine = new PhysicsEngine(
            this.gridSize,
            this.players,
            this.fireManager
        );

        // broadcast any change
        this.eventEmitter.on('entityUpdated', () => {
            this.io.emit('updateArenaState', {
                players: serializePlayers(this.players),
                fires: this.fireManager.getFires()
            });
        });

        this.eventEmitter.on('playSound', payload => {
            // broadcast sfx sound all connected sockets:
            this.io.emit('playSound', payload);
        });

        // on death, maybe end the round
        this.eventEmitter.on('playerDied', pid => {
            this.eventEmitter.emit('entityUpdated');
            this._checkEndOfRound();
        });

        // on all fires out, end the round
        this.eventEmitter.on('firesCleared', () => {
            this.eventEmitter.emit('entityUpdated');
            this._endRound();
        });

        this._setupSockets();
    }

    /**
     * Checks if only ≤1 human is left alive.
     * If so, ends the round.
     */
    _checkEndOfRound() {
        const aliveHumans = Object.values(this.players)
            .filter(p => p.isAlive && !p.isBot).length;
        if (aliveHumans <= 1) {
            this._endRound();
        }
    }

    /**
     * Ends the round:
     * 1) award the sole survivor (if any) bonus points
     * 2) broadcast final state
     * 3) send all back to lobby with their final skin+score
     * 4) tear down the fire spread
     */
    _endRound() {
        const allHumans = Object.values(this.players)
            .filter(p => !p.isBot);
        const totalHumans = allHumans.length;
        // who’s still alive?
        const survivors = allHumans.filter(p => p.isAlive);

        if (survivors.length > 1) {
            // multiple survivors: give everybody 1 point
            survivors.forEach(p => {
                p.score = (p.score || 0) + 1;
            });
            console.log(`Arena: All survivors awarded 1 point`);
        } else if (survivors.length === 1) {
            // exactly one survivor: bonus = total opponents
            const bonus = totalHumans - 1;
            survivors[0].score = (survivors[0].score || 0) + bonus;
            console.log(
                `Arena: survivor ${survivors[0].skin} awarded ${bonus} points`
            );
        }
        // broadcast updated scores + fires=0
        this.eventEmitter.emit('entityUpdated');

        // send everyone back
        console.log("Arena: Round over → sending everyone back to lobby");
        for (const [id, p] of Object.entries(this.players)) {
            this.io.to(id).emit('switchToLobby', {
                skin: p.skin,
                score: p.score
            });
        }

        // stop fire spread
        this.fireManager.shutdown();
    }

    _setupSockets() {
        this.io.on('connection', socket => {
            console.log(`Arena: ${socket.id} connected`);

            const assigned = assignArenaPlayerFromLobby(
                socket.handshake.query,
                this.availableSkins
            );
            if (!assigned) {
                socket.emit('noSkinAvailable', {message: 'Missing or invalid player data.'});
                return socket.disconnect(true);
            }

            // no duplicate skins
            const used = new Set(Object.values(this.players).map(p => p.skin));
            if (used.has(assigned.skin)) {
                socket.emit('noSkinAvailable', {message: 'This skin is already in the arena.'});
                return socket.disconnect(true);
            }

            // spawn
            const spawn = this.physicsEngine.findSafeSpawnLocation(
                this.fireManager.getFires()
            );
            if (!spawn) {
                socket.emit('noSafeSpawn');
                return socket.disconnect(true);
            }

            const ctx = {
                players: this.players,
                gridSize: this.gridSize,
                physicsEngine: this.physicsEngine,
                eventEmitter: this.eventEmitter
            };
            this.players[socket.id] = createPlayer(
                socket.id, spawn, assigned.skin, assigned.score, ctx
            );

            // kick off fire spreading
            this.fireManager.startFireInterval();

            // handshake + initial state
            socket.emit('initializeArena', {gridSize: this.gridSize});
            this.eventEmitter.emit('entityUpdated');

            // client inputs
            socket.on('arenaPlayerMove', m => this.players[socket.id]?.move(m, this.fireManager.getFires()));
            socket.on('arenaPlayerPunch', d => this.players[socket.id]?.punch(d, this.fireManager.getFires()));

            socket.on('exitArenaAll', () => {
                for (const [id, p] of Object.entries(this.players)) {
                    this.io.to(id).emit('switchToLobby', {
                        skin: p.skin,
                        score: p.score
                    });
                }
                this.fireManager.shutdown();
            });

            socket.on('disconnect', () => {
                console.log(`Arena: ${socket.id} disconnected`);
                delete this.players[socket.id];
                this.eventEmitter.emit('entityUpdated');

                if (Object.keys(this.players).length === 0) {
                    this.fireManager.shutdown();
                } else {
                    this._checkEndOfRound();
                }
            });
        });
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`Arena server listening on port ${this.port}`);
        });
    }
}

module.exports = ArenaServer;
