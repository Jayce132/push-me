import React, { useEffect, useState } from 'react';
import { Player } from './Player.jsx';
import { Ghost } from './Ghost';
import { Fire } from './Fire';
import { PlayerList } from './PlayerList';
import { Wall } from './Wall'; // import our new Wall component
import { io } from 'socket.io-client';

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

export const Grid = () => {
    const [gameState, setGameState] = useState({
        players: {},
        fires: [],
    });
    const [socket, setSocket] = useState(null);
    const [gridSize, setGridSize] = useState(20);
    const [currentSocketId, setCurrentSocketId] = useState(null);
    const cellSize = 32;
    const innerGridWidth = gridSize * cellSize;
    const innerGridHeight = gridSize * cellSize;
    // Outer container size includes walls (one cell on each side).
    const outerWidth = innerGridWidth + 2 * cellSize;
    const outerHeight = innerGridHeight + 2 * cellSize;

    useEffect(() => {
        const socket = io('http://localhost:3000');
        setSocket(socket);
        socket.on('connect', () => {
            setCurrentSocketId(socket.id);
        });
        socket.on('initializeGame', (data) => {
            setGridSize(data.gridSize);
        });
        socket.on('updateState', (updatedGameState) => {
            setGameState(updatedGameState);
        });
        socket.on('gameOver', (data) => {
            if (data.socketId === socket.id) {
                socket.disconnect();
                alert('Game Over 😭🔥');
            }
        });
        socket.on('noSafeSpawn', () => {
            socket.disconnect();
            alert('No safe spaces to spawn 😭🔥');
        });
        return () => {
            socket.disconnect();
        };
    }, []);

    const movePlayer = (move) => {
        socket.emit('playerMove', move);
    };

    const handlePlayerPunch = (punchDir) => {
        socket.emit('playerPunch', punchDir);
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
            {/* Left side: Future expansion */}
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
                <h3>Start Game</h3>
                <button>Start</button>
            </div>

            {/* Center: Outer container with walls */}
            <div
                style={{
                    position: 'relative',
                    width: outerWidth,
                    height: outerHeight,
                }}
            >
                {/* Render the walls as a border */}
                <Wall gridSize={gridSize} cellSize={cellSize} />
                {/* Render the inner game grid offset by one cell */}
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
                    {Object.keys(gameState.players).map((playerId) => (
                        <Player
                            key={playerId}
                            position={gameState.players[playerId].position}
                            cellSize={cellSize}
                            onMove={movePlayer}
                            onPunch={handlePlayerPunch}
                            isCurrentPlayer={playerId === socket.id}
                            skin={gameState.players[playerId].skin} // skin comes from the server
                        />
                    ))}
                    {gameState.fires.map((fire, index) => (
                        <Fire key={index} position={fire} cellSize={cellSize} />
                    ))}
                </div>
            </div>

            {/* Right side: Player list with emojis and (you) for current client */}
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
                <PlayerList players={gameState.players} currentSocketId={currentSocketId} />
            </div>
        </div>
    );
};
