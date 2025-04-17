import React, { useEffect, useState } from 'react';
import { Player } from './Player.jsx';
import { PlayerList } from './PlayerList';
import { Wall } from './Wall';
import { io } from 'socket.io-client';
import { Bot } from './Bot.jsx';

const Cell = ({ x, y, cellSize }) => (
    <div
        style={{
            gridRowStart: x + 1,
            gridColumnStart: y + 1,
            width: `${cellSize}px`,
            height: `${cellSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${cellSize}px`,
            border: '1px solid black',
            backgroundColor: 'green',
        }}
    ></div>
);

export const LobbyGrid = ({ setInLobby }) => {
    const [gameState, setGameState] = useState({ players: {}, fires: [] });
    const [socket, setSocket] = useState(null);
    const [gridSize, setGridSize] = useState(20);
    const [humanCount, setHumanCount] = useState(0);
    const [readyCount, setReadyCount] = useState(0);
    const cellSize = 32;
    const innerGridWidth = gridSize * cellSize;
    const innerGridHeight = gridSize * cellSize;
    const outerWidth = innerGridWidth + 2 * cellSize;
    const outerHeight = innerGridHeight + 2 * cellSize;

    useEffect(() => {
        const socket = io('http://localhost:3001');
        setSocket(socket);

        socket.on('initializeGame', (data) => {
            setGridSize(data.gridSize);
        });

        socket.on('updateState', (updatedGameState) => {
            setGameState(updatedGameState);
            const allHumans = Object.keys(updatedGameState.players).filter(pid => !updatedGameState.players[pid].isBot);
            setHumanCount(allHumans.length);
        });

        socket.on('updateReadyCount', (count) => {
            setReadyCount(count);
        });

        socket.on('noSafeSpawn', () => {
            console.warn('No safe spawn available in the lobby.');
        });

        socket.on('switchGame', (data) => {
            setInLobby(false);
        });

        return () => {
            socket.disconnect();
        };
    }, [setInLobby]);

    const movePlayer = (move) => {
        socket.emit('playerMove', move);
    };

    const handlePlayerPunch = (punchDir) => {
        socket.emit('playerPunch', punchDir);
    };

    const startGame = () => {
        socket.emit('startGame');
    };

    const renderCells = () => {
        const cells = [];
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                cells.push(<Cell key={`${i}-${j}`} x={i} y={j} cellSize={cellSize} />);
            }
        }
        return cells;
    };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100vw',
                height: '100vh',
            }}
        >
            {/* Left side: Lobby controls */}
            <div
                style={{
                    width: '20%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <h3>Lobby</h3>
                <p>Humans in lobby: {humanCount}</p>
                <p>Ready: {readyCount} / {humanCount}</p>
                <button onClick={startGame}>Start Game</button>
            </div>

            {/* Center: Game grid */}
            <div
                style={{
                    position: 'relative',
                    width: outerWidth,
                    height: outerHeight,
                }}
            >
                <Wall gridSize={gridSize} cellSize={cellSize} />
                <div
                    style={{
                        position: 'absolute',
                        top: `${cellSize}px`,
                        left: `${cellSize}px`,
                        width: innerGridWidth,
                        height: innerGridHeight,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                        gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
                        gridGap: '0px',
                    }}
                >
                    {renderCells()}
                    {Object.keys(gameState.players).map((playerId) => {
                        const p = gameState.players[playerId];
                        if (p.isBot) {
                            return (
                                <Bot
                                    key={playerId}
                                    position={p.position}
                                    cellSize={cellSize}
                                    skin={p.skin}
                                    isPunching={p.isPunching || false}
                                    punchDirection={p.punchDirection || { dx: 0, dy: 0 }}
                                />
                            );
                        } else {
                            return (
                                <Player
                                    key={playerId}
                                    position={p.position}
                                    cellSize={cellSize}
                                    onMove={movePlayer}
                                    onPunch={handlePlayerPunch}
                                    isCurrentPlayer={playerId === (socket ? socket.id : null)}
                                    skin={p.skin}
                                    isPunching={p.isPunching || false}
                                    punchDirection={p.punchDirection || { dx: 0, dy: 0 }}
                                />
                            );
                        }
                    })}
                </div>
            </div>

            {/* Right side: Player list */}
            <div
                style={{
                    width: '20%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                }}
            >
                <PlayerList players={gameState.players} currentSocketId={socket ? socket.id : null} />
            </div>
        </div>
    );
};

export default LobbyGrid;
