// hooks/usePlayerControls.js
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
    const [localPunching,     setLocalPunching]     = useState(false);
    const [localPunchDirection, setLocalPunchDirection] = useState(null);

    // pick local or server-supplied
    const aimDirection = isCurrentPlayer
        ? localLastDirection
        : serverLastDirection;

    const indicatorDistance = cellSize * 0.8;
    const shouldShowPunch   = localPunching;

    useEffect(() => {
        if (!isCurrentPlayer) return;

        const handleKeyDown = e => {
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
            keysPressed.current[e.key] = true;
        };
        const handleKeyUp = e => delete keysPressed.current[e.key];

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        const iv = setInterval(() => {
            let dx = 0, dy = 0;
            if (keysPressed.current['w']) dx -= 1;
            if (keysPressed.current['s']) dx += 1;
            if (keysPressed.current['a']) dy -= 1;
            if (keysPressed.current['d']) dy += 1;
            if (dx !== 0 || dy !== 0) {
                setLocalLastDirection({ dx, dy });
                onMove({ dx, dy });
            }
        }, 75);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup',   handleKeyUp);
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
