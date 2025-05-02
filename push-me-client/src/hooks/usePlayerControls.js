import { useEffect, useRef, useState } from 'react';

/**
 * Encapsulates all the local‐input, aiming, and punching state.
 */
export function usePlayerControls({
                                      isCurrentPlayer,
                                      onMove,
                                      onPunch,
                                      serverLastDirection,
                                      cellSize
                                  }) {
    const keysPressed = useRef({});
    const [localLastDirection, setLocalLastDirection] = useState({ dx: 0, dy: -1 });
    const [localPunching, setLocalPunching] = useState(false);
    const [localPunchDirection, setLocalPunchDirection] = useState(null);

    // pick local or server‐supplied
    const aimDirection = isCurrentPlayer
        ? localLastDirection
        : serverLastDirection;

    const indicatorDistance = cellSize * 0.8;
    const shouldShowPunch = localPunching;

    useEffect(() => {
        if (!isCurrentPlayer) return;

        const handleKeyDown = e => {
            // space = punch
            if (e.key === ' ') {
                e.preventDefault();
                // capture the direction at moment of punch
                setLocalPunchDirection(localLastDirection);
                setLocalPunching(true);
                onPunch(localLastDirection);
                setTimeout(() => {
                    setLocalPunching(false);
                    setLocalPunchDirection(null);
                }, 100);
                return;
            }

            // movement keys: WASD (any case) + arrows
            const movementKeys = [
                'w','W','a','A','s','S','d','D',
                'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'
            ];
            if (movementKeys.includes(e.key)) {
                e.preventDefault();
                keysPressed.current[e.key] = true;
            }
        };

        const handleKeyUp = e => {
            delete keysPressed.current[e.key];
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const iv = setInterval(() => {
            let dx = 0, dy = 0;
            // up: W or w or ArrowUp
            if (keysPressed.current['w'] || keysPressed.current['W'] || keysPressed.current['ArrowUp']) {
                dx -= 1;
            }
            // down: S or s or ArrowDown
            if (keysPressed.current['s'] || keysPressed.current['S'] || keysPressed.current['ArrowDown']) {
                dx += 1;
            }
            // left: A or a or ArrowLeft
            if (keysPressed.current['a'] || keysPressed.current['A'] || keysPressed.current['ArrowLeft']) {
                dy -= 1;
            }
            // right: D or d or ArrowRight
            if (keysPressed.current['d'] || keysPressed.current['D'] || keysPressed.current['ArrowRight']) {
                dy += 1;
            }

            if (dx !== 0 || dy !== 0) {
                setLocalLastDirection({ dx, dy });
                onMove({ dx, dy });
            }
        }, 75);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            clearInterval(iv);
        };
    }, [isCurrentPlayer, onMove, onPunch, localLastDirection]);

    return {
        aimDirection,
        indicatorDistance,
        shouldShowPunch,
        localPunchDirection
    };
}
