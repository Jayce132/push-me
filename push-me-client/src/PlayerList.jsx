import React from 'react';

export const PlayerList = ({ players }) => {
    // Use the same emoji order as in Grid
    const playerEmojis = ['😭', '😫', '😳', '😨'];
    const playerIds = Object.keys(players).sort();

    return (
        <div className="player-list">
            <h3>Connected Players</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {playerIds.map((playerId, index) => (
                    <li key={playerId} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ marginRight: '8px', fontSize: '1.5rem' }}>
              {playerEmojis[index]}
            </span>
                        <span>{playerId}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
