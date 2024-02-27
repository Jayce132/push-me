import React from 'react';

export const Ghost = ({ position, cellSize }) => {
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
                zIndex: 9,
            }}
        >
            <span role="img" aria-label="ghost">👻</span>
        </div>
    );
};

