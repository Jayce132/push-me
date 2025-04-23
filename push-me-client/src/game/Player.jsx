import React, { useEffect, useRef, useState } from 'react';

export const Player = ({
                           position,
                           onMove,
                           onPunch,
                           cellSize,
                           isCurrentPlayer,
                           skin,
                           isPunching,
                           punchDirection,
                           isKnockedBack,
                           lastDirection: serverLastDirection   // rename the prop
                       }) => {
    const keysPressed = useRef({});
    const [localLastDirection, setLocalLastDirection] = useState({ dx: 0, dy: -1 });
    const [localPunching, setLocalPunching]         = useState(false);

    // Which direction to show the "aim" icon in:
    const aimDirection = isCurrentPlayer
        ? localLastDirection
        : serverLastDirection;

    // how far (in pixels) to offset the indicator from the player center
    const indicatorDistance = cellSize * 0.8;

    const pixelTop  = position.x * cellSize;
    const pixelLeft = position.y * cellSize;

    // Handle WASD + space for current player:
    useEffect(() => {
        if (!isCurrentPlayer) return;

        const handleKeyDown = e => {
            if (e.key === ' ') {
                e.preventDefault();
                setLocalPunching(true);
                setTimeout(() => setLocalPunching(false), 100);
                onPunch(localLastDirection);
                return;
            }
            keysPressed.current[e.key] = true;
        };

        const handleKeyUp = e => {
            delete keysPressed.current[e.key];
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup',   handleKeyUp);

        const interval = setInterval(() => {
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
            clearInterval(interval);
        };
    }, [isCurrentPlayer, onMove, onPunch, localLastDirection]);

    const shouldShowPunch = localPunching || isPunching;

    return (
        <div
            style={{
                position:   'absolute',
                top:        `${pixelTop}px`,
                left:       `${pixelLeft}px`,
                width:      `${cellSize}px`,
                height:     `${cellSize}px`,
                transition: 'top 0.1s ease, left 0.1s ease, transform 0.1s ease',
                transform:  isKnockedBack ? 'scale(3)' : 'scale(1)',
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize:   `${cellSize}px`,
                zIndex:     10,
            }}
        >
            {/* Your player skin */}
            <span role="img" aria-label="player">
        {skin}
      </span>

            {/* Aim indicator in the adjacent cell */}
            <div
                style={{
                    position:       'absolute',
                    top:           `${aimDirection.dx * indicatorDistance}px`,
                    left:          `${aimDirection.dy * indicatorDistance}px`,
                    width:          `${cellSize}px`,
                    height:         `${cellSize}px`,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    fontSize:       `${cellSize * 0.5}px`,
                    pointerEvents:  'none',
                    zIndex:         5,
                }}
            >
                👊
            </div>

            {/* Punch animation overlay */}
            {shouldShowPunch && (
                <div
                    style={{
                        position:       'absolute',
                        top:            `${(isPunching ? punchDirection.dx : aimDirection.dx) * cellSize}px`,
                        left:           `${(isPunching ? punchDirection.dy : aimDirection.dy) * cellSize}px`,
                        width:          `${cellSize}px`,
                        height:         `${cellSize}px`,
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: 'center',
                        pointerEvents:  'none',
                        zIndex:         11,
                    }}
                >
                    👊
                </div>
            )}
        </div>
    );
};
