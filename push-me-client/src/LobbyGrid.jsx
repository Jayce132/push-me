import React, {useEffect, useState} from 'react';
import {io} from 'socket.io-client';
import {Player} from './Player.jsx';
import {Bot} from './Bot.jsx';
import {PlayerList} from './PlayerList';
import {Wall} from './Wall';
import Cell from "./Cell.jsx";

/**
 * LobbyGrid connects to the unified server on a single port,
 * joining the 'lobby' room and handling lobby-specific events.
 */
export const LobbyGrid = ({ setInLobby, setPlayerId, playerId }) => {
    const [gameState, setGameState] = useState({players: {}, fires: []});
    const [socket, setSocket] = useState(null);
    const [gridSize, setGridSize] = useState(20);
    const [humanCount, setHumanCount] = useState(0);
    const [readyCount, setReadyCount] = useState(0);

    const cellSize = 32;
    const innerWidth = gridSize * cellSize;
    const innerHeight = gridSize * cellSize;
    const outerWidth = innerWidth + 2 * cellSize;
    const outerHeight = innerHeight + 2 * cellSize;

    useEffect(() => {
        // Connect to unified server and join lobby room
        const q = { room:'lobby' };
        if (playerId) q.playerId = playerId;
        const s = io('http://localhost:3000',{ query:q });
        setSocket(s);

        // ← listen for initializeLobby, not initializeGame
        s.on('initializeLobby', ({ gridSize, playerId }) => {
            setGridSize(gridSize);
            setPlayerId(playerId);    // ← store it in App.jsx
        });

        s.on('updateState', state => {
            setGameState(state);
            const humans = Object.values(state.players).filter(p => !p.isBot).length;
            setHumanCount(humans);
        });

        s.on('updateReadyCount', count => {
            setReadyCount(count);
        });

        s.on('noSafeSpawn', () => {
            console.warn('Lobby: No safe spawn available');
        });

        s.on('assignPlayerId', id => setPlayerId(id))   // <— grab it once

        s.on('switchRoom', ({next, playerId}) => {
            if (next === 'game') {
                s.disconnect();
                setPlayerId(playerId);    // store this
                setInLobby(false);
            }
        });

        return () => {
            s.disconnect();
        };
    }, [setInLobby]);

    const movePlayer = move => socket && socket.emit('playerMove', move);
    const punchPlayer = dir => socket && socket.emit('playerPunch', dir);
    const startGame = () => socket && socket.emit('startGame');

    const renderCells = () => {
        const cells = [];
        for (let x = 0; x < gridSize; x++) {
            for (let y = 0; y < gridSize; y++) {
                cells.push(<Cell key={`${x}-${y}`} x={x} y={y} cellSize={cellSize}/>);
            }
        }
        return cells;
    };

    return (
        <div style={{display: 'flex', width: '100vw', height: '100vh'}}>
            {/* Controls */}
            <div style={{width: '20%', padding: '1rem'}}>
                <h3>Lobby</h3>
                <p>Humans: {humanCount}</p>
                <p>Ready: {readyCount} / {humanCount}</p>
                <button onClick={startGame}>Start Game</button>
            </div>

            {/* Grid */}
            <div style={{position: 'relative', width: outerWidth, height: outerHeight}}>
                <Wall gridSize={gridSize} cellSize={cellSize}/>
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
                    {Object.entries(gameState.players).map(([id, p]) =>
                        p.isBot ? (
                            <Bot
                                key={id}
                                position={p.position}
                                cellSize={cellSize}
                                skin={p.skin}
                                isPunching={p.isPunching}
                                punchDirection={p.punchDirection}
                            />
                        ) : (
                            <Player
                                key={id}
                                position={p.position}
                                cellSize={cellSize}
                                onMove={movePlayer}
                                onPunch={punchPlayer}
                                isCurrentPlayer={socket?.id === id}
                                skin={p.skin}
                                isPunching={p.isPunching}
                                punchDirection={p.punchDirection}
                            />
                        )
                    )}
                </div>
            </div>

            {/* Player List */}
            <div style={{width: '20%', padding: '1rem'}}>
                <PlayerList players={gameState.players} currentSocketId={socket?.id}/>
            </div>
        </div>
    );
};

export default LobbyGrid;
