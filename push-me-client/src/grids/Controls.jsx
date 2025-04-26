// src/components/Controls.jsx
import React from 'react';

export const LobbyControls = ({ onStart }) => (
    <div style={{
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    }}>
        <h3>Lobby</h3>
        <button onClick={onStart}>Start Arena</button>
    </div>
);

export const ArenaControls = ({ user, onExit }) => (
    <div style={{
        marginBottom: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    }}>
        <h3>Arena</h3>
        <p>Your skin: <span style={{ fontSize: '1.5rem' }}>{user.skin}</span></p>
        <p>Your score: {user.score}</p>
        <button onClick={onExit}>Exit to Lobby</button>
    </div>
);
