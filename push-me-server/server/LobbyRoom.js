// server/LobbyRoom.js
const PhysicsEngine = require('../game/PhysicsEngine');
const Player        = require('../game/Player');
const Bot           = require('../game/Bot');

class LobbyRoom {
    /**
     * @param {Server}     io
     * @param {string}     roomName      e.g. 'lobby'
     * @param {object}     config
     * @param {number}     config.gridSize
     * @param {string[]}   config.availableSkins
     * @param {string}     config.botSkin
     * @param {Object}     config.players      — shared lobby‐side players map
     * @param {EventEmitter} config.eventEmitter
     */
    constructor(io, roomName, { gridSize, availableSkins, botSkin, players, eventEmitter }) {
        this.io             = io;
        this.room           = roomName;
        this.gridSize       = gridSize;
        this.availableSkins = availableSkins;
        this.botSkin        = botSkin;
        this.players        = players;       // { socketId: Player }
        this.eventEmitter   = eventEmitter;  // shared bus

        this.fires          = [];
        this.physicsEngine  = new PhysicsEngine(this.gridSize, this.players);
        this.readyPlayers   = new Set();
    }

    /** Called once at startup */
    init() {
        this._bindGlobalEvents();
        this._listenConnections();
    }

    /**
     * Invoked by index.js when a round ends, to repopulate lobby from gamePlayers
     * @param {Object} gamePlayers  — the game‐side players map
     * @param {string[]} humanIds   — which IDs to bring back
     */
    addPlayersFromGame(gamePlayers, humanIds) {
        humanIds.forEach(id => {
            // reuse the Player instance so socketId stays the same
            this.players[id] = gamePlayers[id];
        });
    }

    _bindGlobalEvents() {
        // mirror any entityUpdated into lobby clients
        this.eventEmitter.on('entityUpdated', payload => {
            if (payload && !this.players[payload]) return;
            const state = {
                players: this.players,
                fires:   this.fires,
                ...(payload != null && { updatedId: payload })
            };
            console.log('→ [LobbyRoom] broadcasting updateState:', JSON.stringify(state));
            this.io.to(this.room).emit('updateState', state);
        });

        // clear lobby fires when all extinguished
        this.eventEmitter.on('firesCleared', () => {
            console.log('→ [LobbyRoom] firesCleared, resetting lobby fires');
            this.fires = [];
            this.io.to(this.room).emit('updateState', {
                players: this.players,
                fires:   this.fires
            });
        });
    }

    _listenConnections() {
        this.io.on('connection', socket => {
            if (socket.handshake.query.room !== this.room) return;
            const sid = socket.id;
            socket.join(this.room);
            socket.emit('assignPlayerId', socket.id)
            console.log(`LobbyRoom: ${sid} joined [${this.room}]`);

            // spawn them somewhere safe
            const spawn = this.physicsEngine.findSafeSpawnLocation(this.fires);
            if (!spawn) {
                socket.emit('noSafeSpawn');
                return socket.disconnect(true);
            }

            // pick a free skin
            const used = Object.values(this.players)
                .filter(p => !p.isBot)
                .map(p => p.skin);
            const skin = this.availableSkins.find(s => !used.includes(s)) || this.availableSkins[0];

            // create & store Player
            const ctx = {
                players:       this.players,
                gridSize:      this.gridSize,
                physicsEngine: this.physicsEngine,
                botSkin:       this.botSkin,
                eventEmitter:  this.eventEmitter
            };
            this.players[sid] = new Player(sid, spawn, skin, ctx);

            // initial handshake – tell the client its permanent id
            socket.emit('initializeLobby', {
                gridSize: this.gridSize,
                playerId: socket.id    // ← send them their id
            });
            socket.emit('updateState', {
                players: this.players,
                fires:   this.fires
            });

            // movement & punch
            socket.on('playerMove', move => {
                this.players[sid]?.move(move, this.fires);
            });
            socket.on('playerPunch', dir => {
                this.players[sid]?.punch(dir, this.fires);
            });

            // ready to start
            socket.on('startGame', () => {
                this.readyPlayers.add(sid);
                this.io.to(this.room).emit('updateReadyCount', this.readyPlayers.size);

                const humanIds = Object.keys(this.players).filter(id => !this.players[id].isBot);
                if (this.readyPlayers.size === humanIds.length) {
                    // fire high‑level event — index.js will handle the hand‑off
                    this.eventEmitter.emit('startGame', humanIds);

                    // clear lobby state
                    humanIds.forEach(id => delete this.players[id]);
                    this.readyPlayers.clear();
                    this.io.to(this.room).emit('updateReadyCount', 0);
                }
            });

            // disconnect cleanup
            socket.on('disconnect', () => {
                delete this.players[sid];
                this.io.to(this.room).emit('updateState', { players: this.players, fires: this.fires });

                const humanCount = Object.values(this.players).filter(p => !p.isBot).length;
                if (humanCount === 0) {
                    // wipe everything if nobody left
                    Object.keys(this.players).forEach(id => delete this.players[id]);
                    this.io.to(this.room).emit('updateState', { players: this.players, fires: this.fires });
                }
            });

            // bots
            this._maybeSpawnBot();
        });
    }

    _maybeSpawnBot() {
        const hasBot    = Object.values(this.players).some(p => p.isBot);
        const humanCount = Object.values(this.players).filter(p => !p.isBot).length;
        if (humanCount > 0 && !hasBot) this.spawnBot();
    }

    spawnBot() {
        const botId = `bot-${Date.now()}`;
        const spawn = this.physicsEngine.findSafeSpawnLocation(this.fires);
        if (!spawn) return;

        const ctx = {
            players:       this.players,
            gridSize:      this.gridSize,
            physicsEngine: this.physicsEngine,
            botSkin:       this.botSkin,
            eventEmitter:  this.eventEmitter
        };
        const bot = new Bot(botId, spawn, ctx);
        this.players[botId] = bot;

        this.io.to(this.room).emit('updateState', { players: this.players, fires: this.fires });
        setInterval(() => bot.update(), 250);
    }
}

module.exports = LobbyRoom;
