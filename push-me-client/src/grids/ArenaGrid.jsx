import React from 'react';
import Cell from '../game/Cell.jsx';
import { Wall } from '../game/Wall.jsx';
import { PlayerList } from '../PlayerList.jsx';
import { Player } from '../game/Player.jsx';
import { Ghost } from '../game/Ghost.jsx';
import { Fire } from '../Fire.jsx';
import { useGameSocket } from '../hooks/useGameSocket.js';
import { useGridDimensions } from "../hooks/useGridDimensions.js";

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
        innerWidth, innerHeight,
        outerWidth, outerHeight,
        cellSize
    } = useGridDimensions(gridSize);

    const exitArenaAll = () => socket.emit('exitArenaAll');

    return (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', width:'100vw', height:'100vh' }}>
            <div style={{ width:'20%', display:'flex', flexDirection:'column', alignItems:'center' }}>
                <h3>Arena</h3>
                <p>Your skin: <span style={{ fontSize:'1.5rem' }}>{user.skin}</span></p>
                <p>Your score: {user.score}</p>
                <button onClick={exitArenaAll}>Exit to Lobby</button>
            </div>

            <div style={{ position:'relative', width:outerWidth, height:outerHeight }}>
                <Wall gridSize={gridSize} cellSize={cellSize} />
                <div style={{
                    position:'absolute',
                    top: cellSize,
                    left: cellSize,
                    width: innerWidth,
                    height: innerHeight,
                    display:'grid',
                    gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                    gridTemplateRows:    `repeat(${gridSize}, ${cellSize}px)`
                }}>
                    {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                        const x = i % gridSize;
                        const y = Math.floor(i / gridSize);
                        return <Cell key={`${x}-${y}`} x={x} y={y} cellSize={cellSize} />;
                    })}

                    {Object.entries(players).map(([pid, p]) => {
                        const isYou = pid === socket.id;
                        return p.isAlive === false
                            ? <Ghost
                                key={pid}
                                position={p.position}
                                onMove={m => socket.emit('arenaPlayerMove', m)}
                                onPunch={d => socket.emit('arenaPlayerPunch', d)}
                                cellSize={cellSize}
                                isCurrentPlayer={isYou}
                                isKnockedBack={p.isKnockedBack}
                                lastDirection={p.lastDirection}
                            />
                            : <Player
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
                            />;
                    })}

                    {fires.map((fire, i) => (
                        <Fire key={i} position={fire} cellSize={cellSize} />
                    ))}
                </div>
            </div>

            <div style={{ width:'20%', display:'flex', flexDirection:'column', alignItems:'center', overflowY:'auto' }}>
                <PlayerList
                    players={players}
                    currentUser={user}
                    currentSocketId={socket?.id}
                />
            </div>
        </div>
    );
};

export default ArenaGrid;
