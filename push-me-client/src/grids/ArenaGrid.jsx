// src/components/ArenaGrid.jsx
import React from 'react';
import Cell from '../game/Cell.jsx';
import { Wall } from '../game/Wall.jsx';
import { PlayerList } from '../PlayerList.jsx';
import { Player } from '../game/Player.jsx';
import { Ghost } from '../game/Ghost.jsx';
import { Fire } from '../Fire.jsx';
import { useGameSocket } from '../hooks/useGameSocket.js';
import { useGridDimensions } from '../hooks/useGridDimensions.js';
import { useCamera } from '../hooks/useCamera.js';
import { ArenaControls } from './Controls.jsx';

export const ArenaGrid = ({ user, setUser, setInLobby }) => {
    const {
        socket,
        gameState: { players, fires },
        gridSize
    } = useGameSocket({
        url: 'http://localhost:3000',
        user,
        setUser,
        setInLobby,
        initEvent:   'initializeArena',
        updateEvent: 'updateArenaState',
        switchEvent: 'switchToLobby'
    });

    const {
        innerWidth,
        innerHeight,
        outerWidth,
        outerHeight,
        cellSize
    } = useGridDimensions(gridSize);

    // your own player
    const me = players?.[socket?.id] || { position: { x: 0, y: 0 } };

    // two-half camera: top/bottom (and left/right) halves
    const { offsetX, offsetY, transition } = useCamera({
        position: me.position,
        cellSize,
        outerWidth,
        outerHeight,
        gridSize,
        transition: 'transform 0.1s ease'
    });

    const exitArenaAll = () => socket.emit('exitArenaAll');

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                width: '100vw',
                height: '100vh',
                overflow: 'hidden'   // prevent page scroll
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
                {/* entire map, shifted into one of two halves */}
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
                            gridTemplateRows:    `repeat(${gridSize}, ${cellSize}px)`
                        }}
                    >
                        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                            const x = i % gridSize;
                            const y = Math.floor(i / gridSize);
                            return <Cell key={`${x}-${y}`} x={x} y={y} cellSize={cellSize} />;
                        })}

                        {Object.entries(players).map(([pid, p]) => {
                            const isYou = pid === socket.id;

                            if (!p.isAlive) {
                                return (
                                    <Ghost
                                        key={pid}
                                        position={p.position}
                                        cellSize={cellSize}
                                        onMove={m => socket.emit('arenaPlayerMove', m)}
                                        onPunch={d => socket.emit('arenaPlayerPunch', d)}
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
                                    onMove={m => socket.emit('arenaPlayerMove', m)}
                                    onPunch={d => socket.emit('arenaPlayerPunch', d)}
                                    isCurrentPlayer={isYou}
                                    skin={p.skin}
                                    isPunching={p.isPunching}
                                    punchDirection={p.punchDirection}
                                    isKnockedBack={p.isKnockedBack}
                                    lastDirection={p.lastDirection}
                                />
                            );
                        })}

                        {fires.map((fire, i) => (
                            <Fire key={i} position={fire} cellSize={cellSize} />
                        ))}
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
                    players={players}
                    currentUser={user}
                    currentSocketId={socket?.id}
                />
                <ArenaControls user={user} onExit={exitArenaAll} />

            </div>
        </div>
    );
};

export default ArenaGrid;
