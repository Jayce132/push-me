import React from 'react';
import '../screens/Sidebar.css'; // adjust path if needed

export const PlayerList = ({ players, currentUser, currentSocketId }) => {
    const sorted = Object.entries(players)
        .sort(([, a], [, b]) => (b.score ?? 0) - (a.score ?? 0));

    return (
        <div className="sidebar">
            <h3 className="sidebar-title">Connected Players</h3>
            <ul className="sidebar-list">
                {sorted.map(([pid, p]) => {
                    const isYou = pid === currentSocketId;
                    const emoji = p.isAlive === false ? '👻' : p.skin;
                    const status = p.isAlive === false ? '(ghost)' : '';
                    return (
                        <li key={pid} className="sidebar-item">
                            <span className="sidebar-emoji">{emoji}</span>
                            <span>
                {isYou && '(you) '}
                                {status} Score: {p.score ?? 0}
              </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
