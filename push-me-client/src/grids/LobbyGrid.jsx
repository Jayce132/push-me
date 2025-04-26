import React from 'react';
import Cell from '../game/Cell.jsx';
import { Wall } from '../game/Wall.jsx';
import { PlayerList } from '../PlayerList.jsx';
import { Player } from '../game/Player.jsx';
import { Ghost } from '../game/Ghost.jsx';
import { useGameSocket } from '../hooks/useGameSocket.js';
import { useGridDimensions } from '../hooks/useGridDimensions.js';
import { useCamera } from '../hooks/useCamera.js';
import { LobbyControls } from './Controls.jsx';

export const LobbyGrid = ({ user, setUser, setInLobby }) => {
    const {
        socket,
        gameState: lobbyState,
        gridSize
    } = useGameSocket({
        url: 'http://localhost:3001',
        user,
        setUser,
        setInLobby,
        initEvent: 'initializeLobby',
        updateEvent: 'lobbyEntityUpdated',
        switchEvent: 'switchToArena'
    });

    const { innerWidth, innerHeight, outerWidth, outerHeight, cellSize } =
        useGridDimensions(gridSize);

    // our player
    const me = lobbyState.players?.[socket?.id] || { position: { x: 0, y: 0 } };

    // two-half camera
    const { offsetX, offsetY, transition } = useCamera({
        position: me.position,
        cellSize,
        outerWidth,
        outerHeight,
        gridSize,
        transition: 'transform 0.1s ease'
    });

    const startArena = () => socket.emit('startArena');

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                width: '100vw',
                height: '100vh',
                overflow: 'hidden'   // no page‐scroll
            }}
        >
            {/* camera viewport */}
            <div
                style={{
                    position: 'relative',
                    width: outerWidth,
                    height: '100vh',
                    overflow: 'hidden'
                }}
            >
                {/* map: translate to either top or bottom half */}
                <div
                    style={{
                        position: 'absolute',
                        width: outerWidth,
                        height: outerHeight,
                        transform: `translate(${-offsetX}px, ${-offsetY}px)`,
                        transition
                    }}
                >
                    <Wall gridSize={gridSize} cellSize={cellSize} />

                    <div
                        style={{
                            position: 'absolute',
                            top: cellSize,
                            left: cellSize,
                            width: innerWidth,
                            height: innerHeight,
                            display: 'grid',
                            gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                            gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`
                        }}
                    >
                        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                            const x = i % gridSize;
                            const y = Math.floor(i / gridSize);
                            return <Cell key={`${x}-${y}`} x={x} y={y} cellSize={cellSize} />;
                        })}

                        {Object.entries(lobbyState.players).map(([pid, p]) => {
                            const isYou = pid === socket.id;

                            if (!p.isAlive) {
                                return (
                                    <Ghost
                                        key={pid}
                                        position={p.position}
                                        cellSize={cellSize}
                                        onMove={m => socket.emit('lobbyPlayerMove', m)}
                                        onPunch={d => socket.emit('lobbyPlayerPunch', d)}
                                        isCurrentPlayer={isYou}
                                        isKnockedBack={p.isKnockedBack}
                                        lastDirection={p.lastDirection}
                                    />
                                );
                            }

                            return (
                                <Player
                                    key={pid}
                                    position={p.position}
                                    cellSize={cellSize}
                                    onMove={move => socket.emit('lobbyPlayerMove', move)}
                                    onPunch={dir => socket.emit('lobbyPlayerPunch', dir)}
                                    isCurrentPlayer={isYou}
                                    skin={p.skin}
                                    isPunching={p.isPunching}
                                    punchDirection={p.punchDirection}
                                    isKnockedBack={p.isKnockedBack}
                                    lastDirection={p.lastDirection}
                                    nextPunchPower={p.nextPunchPower}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* controls & player list */}
            <div
                style={{
                    width: '20%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    overflowY: 'auto'
                }}
            >
                <PlayerList
                    players={lobbyState.players}
                    currentUser={user}
                    currentSocketId={socket?.id}
                />
                <LobbyControls onStart={startArena} />

            </div>
        </div>
    );
};

export default LobbyGrid;
