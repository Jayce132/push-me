import React from 'react';
import Cell from '../game/Cell.jsx';
import { Wall } from '../game/Wall.jsx';
import { PlayerList } from '../PlayerList.jsx';
import { Player } from '../game/Player.jsx';
import { useGameSocket } from '../hooks/useGameSocket.js';
import { useGridDimensions } from "../hooks/useGridDimensions.js";

export const LobbyGrid = ({ user, setUser, setInLobby }) => {
    const {
        socket,
        gameState: lobbyState,
        gridSize
    } = useGameSocket({
        url: 'http://localhost:3001',
        user,
        setUser,
        setInLobby,
        initEvent: 'initializeLobby',
        updateEvent: 'lobbyEntityUpdated',
        switchEvent: 'switchToArena'
    });

    const { innerWidth, innerHeight, outerWidth, outerHeight, cellSize } =
        useGridDimensions(gridSize);

    const startArena = () => {
        socket.emit('startArena');
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100vw', height: '100vh' }}>
            <div style={{ width: '20%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <h3>Lobby</h3>
                <button onClick={startArena}>Start Arena</button>
            </div>

            <div style={{ position: 'relative', width: outerWidth, height: outerHeight }}>
                <Wall gridSize={gridSize} cellSize={cellSize} />
                <div style={{
                    position: 'absolute',
                    top: cellSize,
                    left: cellSize,
                    width: innerWidth,
                    height: innerHeight,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gridSize}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${gridSize}, ${cellSize}px)`
                }}>
                    {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                        const x = i % gridSize;
                        const y = Math.floor(i / gridSize);
                        return <Cell key={`${x}-${y}`} x={x} y={y} cellSize={cellSize} />;
                    })}
                    {Object.entries(lobbyState.players).map(([pid, p]) => (
                        <Player
                            key={pid}
                            position={p.position}
                            cellSize={cellSize}
                            onMove={move => socket.emit('lobbyPlayerMove', move)}
                            onPunch={dir => socket.emit('lobbyPlayerPunch', dir)}
                            isCurrentPlayer={pid === socket.id}
                            skin={p.skin}
                            isPunching={p.isPunching}
                            punchDirection={p.punchDirection}
                        />
                    ))}
                </div>
            </div>

            <div style={{ width: '20%', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
                <PlayerList
                    players={lobbyState.players}
                    currentUser={user}
                    currentSocketId={socket?.id}
                />
            </div>
        </div>
    );
};

export default LobbyGrid;
