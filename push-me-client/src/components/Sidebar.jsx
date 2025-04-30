import React from 'react';

export default function Sidebar({ children }) {
    return (
        <div style={{
            width: '20%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            overflowY: 'auto'
        }}>
            {children}
        </div>
    );
}
