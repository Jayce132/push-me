import React from 'react';
import '../screens/Sidebar.css';

export const LobbyControls = ({ onStart }) => (
    <div className="sidebar">
        <h3 className="sidebar-title">Lobby</h3>
        <button className="sidebar-button" onClick={onStart}>
            Start Arena
        </button>
    </div>
);

export const ArenaControls = ({ user, onExit }) => (
    <div className="sidebar">
        <h3 className="sidebar-title">Arena</h3>
        <p style={{ fontSize: 'calc(1rem + 0.5vw)', color: '#eee' }}>
            Your skin: <span className="sidebar-emoji">{user.skin}</span>
        </p>
        <p style={{ fontSize: 'calc(1rem + 0.5vw)', color: '#eee' }}>
            Your score: {user.score}
        </p>
        <button className="sidebar-button" onClick={onExit}>
            Exit to Lobby
        </button>
    </div>
);
