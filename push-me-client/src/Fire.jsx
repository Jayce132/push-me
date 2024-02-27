import React from 'react';

export const Fire = ({ position, cellSize }) => {
    return (
        <div
            style={{
                gridRowStart: position.x + 1,
                gridColumnStart: position.y + 1,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${cellSize}px`,
                zIndex: 1,
            }}
        >
            <span role="img" aria-label="fire">🔥</span>
        </div>
    );
};

