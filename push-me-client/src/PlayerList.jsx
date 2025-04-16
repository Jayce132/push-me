import React from 'react';

export const PlayerList = ({ players, currentSocketId }) => {
    const playerIds = Object.keys(players);
    return (
        <div className="player-list">
            <h3>Connected Players</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {playerIds.map((playerId) => {
                    const player = players[playerId];
                    return (
                        <li
                            key={playerId}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '4px',
                                color: player.isAlive === false ? 'red' : 'white'
                            }}
                        >
              <span style={{ marginRight: '8px', fontSize: '1.5rem' }}>
                {player.skin || '😭'}
              </span>
                            <span>
                {playerId} {playerId === currentSocketId ? "(you)" : ""}{" "}
                                {player.isAlive === false && "(ghost)"}
              </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
