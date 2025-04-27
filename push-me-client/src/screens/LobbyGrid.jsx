// src/lobby/LobbyGrid.jsx
import React, { useRef } from 'react';
import Cell   from '../game/Cell.jsx';
import { Wall }   from '../game/Wall.jsx';
import { Player } from '../game/Player.jsx';
import { Ghost }  from '../game/Ghost.jsx';
import { useGameSocket }    from '../hooks/useGameSocket.js';
import { useGridDimensions } from '../hooks/useGridDimensions.js';
import { useCamera }         from '../hooks/useCamera.js';

import Sidebar           from './Sidebar.jsx';
import { LobbyControls } from '../components/Controls.jsx';
import { PlayerList }    from '../components/PlayerList.jsx';

export const LobbyGrid = ({ user, setUser, setInLobby }) => {
    // 1) socket + lobby state
    const {
        socket,
        gameState: lobbyState,
        gridSize,
    } = useGameSocket({
        url: 'http://localhost:3001',
        user,
        setUser,
        setInLobby,
        initEvent:   'initializeLobby',
        updateEvent: 'lobbyEntityUpdated',
        switchEvent: 'switchToArena',
    });

    // 2) ref for the flex‐item we want to fill
    const containerRef = useRef(null);

    // 3) measure that width (ignore height!)
    const {
        innerWidth,
        innerHeight,
        outerWidth,
        outerHeight,
        cellSize,
    } = useGridDimensions(gridSize, containerRef, /* widthOnly */ true);

    // 4) camera offsets
    const me = lobbyState.players?.[socket?.id] || { position: { x: 0, y: 0 } };
    const { offsetX, offsetY, transition } = useCamera({
        position:   me.position,
        cellSize,
        outerWidth,
        outerHeight,
        gridSize,
        transition: 'transform 0.1s ease',
    });

    const startArena = () => socket.emit('startArena');

    return (
        <div
            style={{
                position:   'fixed',
                top:        0,
                left:       0,
                width:      '100vw',
                height:     '100vh',
                margin:     0,
                padding:    0,
                display:    'flex',
                overflow:   'hidden',
                background: '#242424'
            }}
        >
            {/* left controls sidebar */}
            <Sidebar>
                <LobbyControls onStart={startArena} />
            </Sidebar>

            {/* center map */}
            <div
                ref={containerRef}
                style={{
                    flex:     1,
                    position: 'relative',
                    height:   '100vh',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        position:  'absolute',
                        width:     outerWidth,
                        height:    outerHeight,
                        transform: `translate(${-offsetX}px, ${-offsetY}px)`,
                        transition,
                    }}
                >
                    <Wall gridSize={gridSize} cellSize={cellSize} />

                    <div
                        style={{
                            position:            'absolute',
                            top:                 cellSize,
                            left:                cellSize,
                            width:               innerWidth,
                            height:              innerHeight,
                            display:             'grid',
                            gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                            gridTemplateRows:    `repeat(${gridSize}, ${cellSize}px)`,
                        }}
                    >
                        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                            const x = i % gridSize, y = Math.floor(i / gridSize);
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

            {/* right player‐list sidebar */}
            <Sidebar>
                <PlayerList
                    players={lobbyState.players}
                    currentUser={user}
                    currentSocketId={socket?.id}
                />
            </Sidebar>
        </div>
    );
};

export default LobbyGrid;
