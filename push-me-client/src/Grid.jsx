import React, { useEffect, useState } from 'react';
import { Player } from './Player.jsx';
import { Ghost } from './Ghost';
import { Fire } from './Fire';
import { io } from 'socket.io-client';

const Cell = ({ x, y, cellSize }) => (
    <div
        style={{
            gridRowStart: x + 1,
            gridColumnStart: y + 1,
            width: '100%',
            height: '100%',
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
    const [gridSize, setGridSize] = useState(20);  // default value, it will be updated upon server message

    const [punchPosition, setPunchPosition] = useState(null);

    const cellSize = 32; // Size of each grid cell in pixels

    useEffect(() => {
        const socket = io('http://localhost:3000');
        setSocket(socket);

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


    const movePlayer = (direction) => {
        socket.emit('playerMove', { direction });
    };

    const handlePlayerPunch = () => {
        socket.emit('playerPunch');

        let dx = 0, dy = 0;
        const currentPlayer = gameState.players[socket.id];
        switch (currentPlayer.lastDirection) {  // Assuming you're tracking lastDirection on server
            case 'up': dx = -1; break;
            case 'down': dx = 1; break;
            case 'left': dy = -1; break;
            case 'right': dy = 1; break;
            default: break;
        }

        const punchX = currentPlayer.position.x + dx;
        const punchY = currentPlayer.position.y + dy;

        setPunchPosition({ x: punchX, y: punchY });
        setTimeout(() => setPunchPosition(null), 500);
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
                display: 'grid',
                gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
                gridGap: '0px',
                width: `${gridSize * cellSize}px`,
                height: `${gridSize * cellSize}px`,
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            }}
        >
            {renderCells()}

            {
                punchPosition && (
                    <div
                        style={{
                            gridRowStart: punchPosition.x + 1,
                            gridColumnStart: punchPosition.y + 1,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: `${cellSize}px`,
                            border: '1px solid black',
                            backgroundColor: 'green',
                        }}
                    >
                        👊
                    </div>
                )
            }

            {Object.keys(gameState.players).map((playerId) => (
                <Player
                    key={playerId}
                    position={gameState.players[playerId].position}
                    lastDirection={gameState.players[playerId].lastDirection}
                    onMove={(direction) => movePlayer(direction, playerId)}
                    onPunch={() => handlePlayerPunch(playerId)}
                    cellSize={cellSize}
                    isCurrentPlayer={playerId === socket.id}
                />
            ))}

            {gameState.fires.map((fire, index) => (
                <Fire key={index} position={fire} cellSize={cellSize} />
            ))}
        </div>
    );
};
