// server/GameRoom.js
const PhysicsEngine = require('../game/PhysicsEngine');
const Player        = require('../game/Player');
const FireManager   = require('../game/FireManager');

class GameRoom {
    /**
     * @param {Server}     io
     * @param {string}     roomName      e.g. 'game'
     * @param {object}     config
     * @param {number}     config.gridSize
     * @param {string[]}   config.availableSkins
     * @param {string}     config.botSkin
     * @param {Object}     config.players      — shared game‐side players map
     * @param {EventEmitter} config.eventEmitter
     */
    constructor(io, roomName, { gridSize, availableSkins, botSkin, players, eventEmitter }) {
        this.io             = io;
        this.room           = roomName;
        this.gridSize       = gridSize;
        this.availableSkins = availableSkins;
        this.botSkin        = botSkin;
        this.players        = players;      // { socketId: Player }
        this.eventEmitter   = eventEmitter; // shared bus

        this.physicsEngine = new PhysicsEngine(this.gridSize, this.players);
        this.fireManager   = new FireManager(
            this.gridSize,
            this.players,
            this.io,
            this.eventEmitter,
            this.room
        );
    }

    /** Wire up all events and socket handlers */
    init() {
        this._bindGlobalEvents();
        this._listenConnections();
    }

    /**
     * Called by index.js when “startGame” fires:
     * brings Player instances *from* lobbyPlayers → this.players
     */
    addPlayersFromLobby(lobbyPlayers, humanIds) {
        humanIds.forEach(id => {
            const old   = lobbyPlayers[id];
            const spawn = this.physicsEngine.findSafeSpawnLocation(this.fireManager.getFires());
            const ctx   = {
                players:       this.players,
                gridSize:      this.gridSize,
                physicsEngine: this.physicsEngine,
                botSkin:       this.botSkin,
                eventEmitter:  this.eventEmitter
            };
            // reuse Player instance so socket.id stays consistent
            this.players[id] = new Player(id, spawn, old.skin, ctx);
            if (old.score != null) this.players[id].score = old.score;
        });
    }

    _bindGlobalEvents() {
        // any entity change → re‑broadcast only to “game” room
        this.eventEmitter.on('entityUpdated', pid => {
            if (pid && !this.players[pid]) return;  // skip lobby entities
            const state = {
                players: this.players,
                fires:   this.fireManager.getFires(),
                ...(pid && { updatedId: pid })
            };
            console.log('→ [GameRoom] broadcasting updateState:', JSON.stringify(state));
            this.io.to(this.room).emit('updateState', state);
        });

        // on death → check whether round should end
        this.eventEmitter.on('playerDied', () => {
            setTimeout(() => this._checkEndOfRound(), 0);
        });

        // when all fires are out → end round
        this.eventEmitter.on('firesCleared', () => {
            console.log('🔥 All fires cleared — ending round');
            this.endRound();
        });
    }

    /** If ≤1 human left alive, end the round */
    _checkEndOfRound() {
        const alive = Object.values(this.players)
            .filter(p => !p.isBot && p.isAlive);
        if (alive.length <= 1) {
            console.log(`🏁 ${alive.length} human(s) remaining — ending round`);
            this.endRound();
        }
    }

    /**
     * Ends the round:
     * 1) broadcast switchRoom→lobby to all in this.room
     * 2) tear down fire loop & clear fires
     * 3) clear this.players
     * 4) reset fireManager for next round
     * 5) emit a high‑level “endRound” so index.js can move them back into lobby
     */
    endRound() {
        // 1) switchRoom for clients
        this.io.to(this.room).emit('switchRoom', { next: 'lobby' });

        // 2) stop spread & clear fires
        this.fireManager.shutdown();

        // 3) clear out players
        Object.keys(this.players).forEach(pid => delete this.players[pid]);

        // 4) prep one fresh fire
        this.fireManager.reset();

        // 5) signal mediator to copy players back into lobby
        this.eventEmitter.emit('endRound');
    }

    _listenConnections() {
        this.io.on('connection', socket => {
            // only handle sockets that asked for room=game
            if (socket.handshake.query.room !== this.room) return;

            const { playerId } = socket.handshake.query;
            if (!playerId || !this.players[playerId]) {
                return socket.disconnect(true);
            }

            socket.join(this.room);
            console.log(`GameRoom: socket ${socket.id} ↔ player ${playerId}`);

            // handshake
            socket.emit('initializeGame', { gridSize: this.gridSize });
            socket.emit('updateState', {
                players: this.players,
                fires:   this.fireManager.getFires()
            });

            // kick off fire spread
            this.fireManager.startFireInterval();

            // route inputs
            socket.on('playerMove',  move => {
                this.players[playerId]?.move(move, this.fireManager.getFires());
            });
            socket.on('playerPunch', dir => {
                this.players[playerId]?.punch(dir, this.fireManager.getFires());
            });

            // on disconnect, remove and maybe end round
            socket.on('disconnect', () => {
                delete this.players[playerId];
                this._checkEndOfRound();

                const humansLeft = Object.values(this.players)
                    .filter(p => !p.isBot).length;
                if (humansLeft === 0) {
                    // no one left → stop fires & wipe state
                    this.fireManager.shutdown();
                    Object.keys(this.players).forEach(pid => delete this.players[pid]);
                } else {
                    // push one final update
                    this.io.to(this.room).emit('updateState', {
                        players: this.players,
                        fires:   this.fireManager.getFires()
                    });
                }
            });
        });
    }
}

module.exports = GameRoom;
