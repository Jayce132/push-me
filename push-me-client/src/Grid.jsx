import React, { useEffect, useState } from 'react';
import { Player } from './Player.jsx';
import { Ghost } from './Ghost';
import { Fire } from './Fire';
import { PlayerList } from './PlayerList';
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
    const cellSize = 32;
    const gridWidth = gridSize * cellSize;
    const gridHeight = gridSize * cellSize;

    // Define skins for up to 4 players.
    const playerSkins = ['😭', '😫', '😳', '😨'];

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

    // Use sorted keys to assign skins in order.
    const sortedPlayerIds = Object.keys(gameState.players).sort();

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                width: '100vw',
                border: '2px solid black',
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

            {/* Center: Main playing area */}
            <div
                style={{
                    width: gridWidth,
                    height: gridHeight,
                    position: 'relative', // Container for absolutely positioned players
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`,
                    gridGap: '0px',
                    border: '2px solid black',
                }}
            >
                {renderCells()}
                {sortedPlayerIds.map((playerId, index) => (
                    <Player
                        key={playerId}
                        position={gameState.players[playerId].position}
                        cellSize={cellSize}
                        onMove={movePlayer} // expects an object {dx, dy}
                        onPunch={handlePlayerPunch} // receives punch direction from Player
                        isCurrentPlayer={playerId === socket.id}
                        skin={playerSkins[index]} // assign skin based on order
                    />
                ))}
                {gameState.fires.map((fire, index) => (
                    <Fire key={index} position={fire} cellSize={cellSize} />
                ))}
            </div>

            {/* Right side: Player list with emojis */}
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
                <PlayerList players={gameState.players} />
            </div>
        </div>
    );
};
