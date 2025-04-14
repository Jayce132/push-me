import React, { useEffect, useRef, useState } from 'react';

export const Player = ({ position, onMove, onPunch, cellSize, isCurrentPlayer, skin }) => {
    const keysPressed = useRef({});
    const [lastDirection, setLastDirection] = useState({ dx: 0, dy: -1 });
    const [isPunching, setIsPunching] = useState(false);

    const pixelTop = position.x * cellSize;
    const pixelLeft = position.y * cellSize;

    useEffect(() => {
        if (!isCurrentPlayer) return;

        const handleKeyDown = (e) => {
            if (e.key === ' ') {
                e.preventDefault(); // prevent scrolling
                setIsPunching(true);
                onPunch(lastDirection);
                setTimeout(() => setIsPunching(false), 100);
                return;
            }
            keysPressed.current[e.key] = true;
        };

        const handleKeyUp = (e) => {
            delete keysPressed.current[e.key];
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const intervalId = setInterval(() => {
            let dx = 0, dy = 0;
            if (keysPressed.current['w']) dx -= 1;
            if (keysPressed.current['s']) dx += 1;
            if (keysPressed.current['a']) dy -= 1;
            if (keysPressed.current['d']) dy += 1;
            if (dx !== 0 || dy !== 0) {
                onMove({ dx, dy });
                setLastDirection({ dx, dy });
            }
        }, 75);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            clearInterval(intervalId);
        };
    }, [onMove, onPunch, isCurrentPlayer, lastDirection]);

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
            <span role="img" aria-label="player">{skin}</span>
            {isPunching && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${lastDirection.dx * cellSize}px`,
                        left: `${lastDirection.dy * cellSize}px`,
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
