import React, { useRef } from 'react';
import Cell            from '../game/Cell.jsx';
import { Wall }        from '../game/Wall.jsx';
import { Player }      from '../game/Player.jsx';
import { Ghost }       from '../game/Ghost.jsx';
import { Fire }        from '../game/Fire.jsx';
import { useGameSocket }    from '../hooks/useGameSocket.js';
import { useGridDimensions } from '../hooks/useGridDimensions.js';
import { useCamera }         from '../hooks/useCamera.js';
import Sidebar               from '../components/Sidebar.jsx';
import {PlayerList} from "../components/PlayerList.jsx";
import {ArenaControls} from "../components/Controls.jsx";

export const ArenaGrid = ({ user, setUser, setInLobby }) => {
    // 1) socket + arena state
    const {
        socket,
        gameState: { players, fires },
        gridSize,
    } = useGameSocket({
        url: 'http://localhost:3000',
        user,
        setUser,
        setInLobby,
        initEvent:   'initializeArena',
        updateEvent: 'updateArenaState',
        switchEvent: 'switchToLobby',
    });

    // 2) ref for the center flex‐item
    const containerRef = useRef(null);

    // 3) measure its width only
    const {
        innerWidth,
        innerHeight,
        outerWidth,
        outerHeight,
        cellSize,
    } = useGridDimensions(gridSize, containerRef, /* widthOnly */ true);

    // 4) camera offsets
    // your own player
    const me = players?.[socket?.id] || { position: { x: 0, y: 0 } };
    const { offsetX, offsetY, transition } = useCamera({
        position:   me.position,
        cellSize,
        outerWidth,
        outerHeight,
        gridSize,
        transition: 'transform 0.1s ease',
    });

    const exitArenaAll = () => socket.emit('exitArenaAll');

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
                background: '#242424',
            }}
        >
            {/* left sidebar: arena controls */}
            <Sidebar>
                <ArenaControls user={user} onExit={exitArenaAll} />
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
                        {/* cells */}
                        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                            const x = i % gridSize, y = Math.floor(i / gridSize);
                            return <Cell key={`${x}-${y}`} x={x} y={y} cellSize={cellSize} />;
                        })}

                        {/* players */}
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
                                    nextPunchPower={p.nextPunchPower}
                                />
                            );
                        })}

                        {/* fires */}
                        {fires.map((fire, i) => (
                            <Fire key={i} position={fire} cellSize={cellSize} />
                        ))}
                    </div>
                </div>
            </div>

            {/* right sidebar: player list */}
            <Sidebar>
                <PlayerList
                    players={players}
                    currentUser={user}
                    currentSocketId={socket?.id}
                />
            </Sidebar>
        </div>
    );
};

export default ArenaGrid;
