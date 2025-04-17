import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Player } from './Player.jsx';
import { Ghost } from './Ghost';
import { Fire } from './Fire';
import { Bot } from './Bot.jsx';
import { PlayerList } from './PlayerList';
import { Wall } from './Wall';
import Cell from "./Cell.jsx";

/**
 * GameGrid connects to the unified server on a single port,
 * joining the 'game' room and handling in-play events.
 */
export const GameGrid = ({ setInLobby, playerId }) => {
    const [gameState, setGameState] = useState({ players: {}, fires: [] });
    const [socket, setSocket] = useState(null);
    const [gridSize, setGridSize] = useState(20);

    const cellSize = 32;
    const innerWidth = gridSize * cellSize;
    const innerHeight = gridSize * cellSize;
    const outerWidth = innerWidth + 2 * cellSize;
    const outerHeight = innerHeight + 2 * cellSize;

    useEffect(() => {
        // Connect and join 'game' room
        const s = io('http://localhost:3000', { query: { room: 'game', playerId } });
        setSocket(s);

        s.on('initializeGame', ({ gridSize }) => {
            setGridSize(gridSize);
        });

        s.on('updateState', state => {
            setGameState(state);
        });

        // Room switch from GameRoom
        s.on('switchRoom', ({ next }) => {
            if (next === 'lobby') {
                s.disconnect();
                setInLobby(true);
            }
        });

        s.on('noSafeSpawn', () => {
            s.disconnect();
            alert('No safe spawn spaces available. Returning to lobby.');
            setInLobby(true);
        });

        return () => {
            s.disconnect();
        };
    }, [setInLobby, playerId]);

    const movePlayer = move => socket && socket.emit('playerMove', move);
    const punchPlayer = dir => socket && socket.emit('playerPunch', dir);

    const renderCells = () => {
        const cells = [];
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                cells.push(<Cell key={`${x}-${y}`} x={x} y={y} cellSize={cellSize} />);
            }
        }
        return cells;
    };

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
            {/* Left panel placeholder */}
            <div style={{ width: '20%', padding: '1rem' }}>
                <h3>Game</h3>
            </div>

            {/* Game grid */}
            <div style={{ position: 'relative', width: outerWidth, height: outerHeight }}>
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
                        gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
                    }}
                >
                    {renderCells()}
                    {Object.entries(gameState.players).map(([id, p]) => {
                        if (p.isBot) {
                            return (
                                <Bot
                                    key={id}
                                    position={p.position}
                                    cellSize={cellSize}
                                    skin={p.skin}
                                    isPunching={p.isPunching}
                                    punchDirection={p.punchDirection}
                                />
                            );
                        } else if (!p.isAlive) {
                            return (
                                <Ghost
                                    key={id}
                                    position={p.position}
                                    cellSize={cellSize}
                                    onMove={movePlayer}
                                    onPunch={punchPlayer}
                                    isCurrentPlayer={id === playerId}
                                />
                            );
                        } else {
                            return (
                                <Player
                                    key={id}
                                    position={p.position}
                                    cellSize={cellSize}
                                    onMove={movePlayer}
                                    onPunch={punchPlayer}
                                    // use persistent playerId
                                    isCurrentPlayer={id === playerId}
                                    skin={p.skin}
                                    isPunching={p.isPunching}
                                    punchDirection={p.punchDirection}
                                />
                            );
                        }
                    })}
                    {gameState.fires.map((fire, idx) => (
                        <Fire key={idx} position={fire} cellSize={cellSize} />
                    ))}
                </div>
            </div>

            {/* Right: Player list */}
            <div style={{ width: '20%', padding: '1rem' }}>
                <PlayerList players={gameState.players} currentSocketId={playerId} />
            </div>
        </div>
    );
};

export default GameGrid;
