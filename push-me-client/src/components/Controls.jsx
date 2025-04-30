import React from 'react';
import './Sidebar.css';

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
        <button className="sidebar-button" onClick={onExit}>
            Exit to Lobby
        </button>
    </div>
);
