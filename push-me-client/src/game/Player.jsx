import React, { useEffect, useRef, useState } from 'react';

export const Player = ({
                           position,
                           onMove,
                           onPunch,
                           cellSize,
                           isCurrentPlayer,
                           skin,
                           isPunching,
                           punchDirection
                       }) => {
    const keysPressed = useRef({});
    const [lastDirection, setLastDirection] = useState({ dx: 0, dy: -1 });
    const [localPunching, setLocalPunching] = useState(false);

    const pixelTop = position.x * cellSize;
    const pixelLeft = position.y * cellSize;

    useEffect(() => {
        if (!isCurrentPlayer) return;

        const handleKeyDown = (e) => {
            if (e.key === ' ') {
                e.preventDefault();
                // Show local punch, because the server only shows it when it hits something
                setLocalPunching(true);
                setTimeout(() => setLocalPunching(false), 100);
                onPunch(lastDirection); // Let server handle real logic
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

    const shouldShowPunch = localPunching || isPunching;

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
            {shouldShowPunch && (
                <div
                    style={{
                        position: 'absolute',
                        top: `${(isPunching ? punchDirection.dx : lastDirection.dx) * cellSize}px`,
                        left: `${(isPunching ? punchDirection.dy : lastDirection.dy) * cellSize}px`,
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
