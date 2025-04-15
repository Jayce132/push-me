import React from 'react';

export const Bot = ({ position, cellSize, skin, isPunching, punchDirection }) => {
    const pixelTop = position.x * cellSize;
    const pixelLeft = position.y * cellSize;

    return (
        <div
            style={{
                position: 'absolute',
                top: `${pixelTop}px`,
                left: `${pixelLeft}px`,
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                transition: 'top 0.1s ease, left 0.1s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: `${cellSize}px`,
                zIndex: 10,
            }}
        >
            <span role="img" aria-label="bot">{skin}</span>
            {isPunching && (
                <div
                    style={{
                        position: 'absolute',
                        // Position the punch indicator in the direction of the punch.
                        top: `${punchDirection.dx * cellSize}px`,
                        left: `${punchDirection.dy * cellSize}px`,
                        width: `${cellSize}px`,
                        height: `${cellSize}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                    }}
                >
                    👊
                </div>
            )}
        </div>
    );
};
