import React from 'react';

export const PlayerList = ({ players, currentSocketId }) => {
    const playerIds = Object.keys(players);
    return (
        <div className="player-list">
            <h3>Connected Players</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {playerIds.map((playerId) => (
                    <li key={playerId} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ marginRight: '8px', fontSize: '1.5rem' }}>
              {players[playerId].skin || '😭'}
            </span>
                        <span>
              {playerId} {playerId === currentSocketId ? "(you)" : ""}
            </span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
